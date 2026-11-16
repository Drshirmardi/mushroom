import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type ProgramService } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import type { ProgramCategoryCreateDto, ProgramCategorySaveDto, ProgramDraftSaveDto, ProgramServiceCreateDto, ProgramServiceQueryDto } from './program-services.dto';
import { ProgramDefinitionCreateDto } from '../definitions/program-definition.dto';
import { ProgramDefinitionService } from '../definitions/program-definition.service';

export type Tx = Prisma.TransactionClient;
export const catalogConflict = () => new ConflictException({ code: 'PROGRAM_SERVICE_CONFLICT', message: 'Service, category or preview changed. Refresh before applying.', details: {} });
export const catalogInvalid = () => new UnprocessableEntityException({ code: 'PROGRAM_SERVICE_INVALID', message: 'Invalid program service operation.', details: {} });
export function serviceView(row: ProgramService) {
  const { clinicId: _clinic, importBaseline: _baseline, sourceReferences: _sources, ...view } = row;
  return { ...view, baseAmountRial: row.baseAmountRial?.toString() ?? null };
}
@Injectable()
export class ProgramServicesService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly definitions: ProgramDefinitionService) {}
  async scoped<T>(ctx: Context, operation: (tx: Tx, clinicId: string) => Promise<T>, write = true): Promise<T> {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      // Category reassignment and draft/import writes must acquire locks in the same order.
      if (write) await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-catalog-write:' + clinicId},0))`);
      return operation(tx, clinicId);
    }, { timeout: 15000, maxWait: 15000 });
  }
  async audit(tx: Tx, ctx: Context, action: string, id: string) {
    await tx.auditEvent.create({ data: { action: `PROGRAM_SERVICE_${action}`, subjectType: 'PROGRAM_SERVICE', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } });
  }
  async lockIdentity(tx: Tx, clinicId: string, programKey: string, locale: string) {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-service:' + clinicId + ':' + programKey + ':' + locale},0))`);
  }
  async owned(tx: Tx, clinicId: string, id: string, revision?: number) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM program_services WHERE id=${id}::uuid AND clinic_id=${clinicId}::uuid FOR UPDATE`);
    const row = await tx.programService.findFirst({ where: { id, clinicId } });
    if (!row) throw new NotFoundException({ code: 'PROGRAM_SERVICE_NOT_FOUND', message: 'Service unavailable.', details: {} });
    if (revision !== undefined && row.revision !== revision) throw catalogConflict();
    return row;
  }
  async category(tx: Tx, clinicId: string, name: string) {
    const normalized = name.trim();
    const existing = await tx.programServiceCategory.findFirst({ where: { clinicId, name: normalized } });
    const row = existing ?? await tx.programServiceCategory.upsert({ where: { clinicId_key: { clinicId, key: createHash('md5').update(normalized).digest('hex') } }, create: { clinicId, key: createHash('md5').update(normalized).digest('hex'), name: normalized }, update: {} });
    await tx.$queryRaw(Prisma.sql`SELECT id FROM program_service_categories WHERE id=${row.id}::uuid FOR SHARE`);
    const live = await tx.programServiceCategory.findUniqueOrThrow({ where: { id: row.id } });
    if (!live.active) throw catalogConflict();
    return live;
  }
  list(query: ProgramServiceQueryDto, ctx: Context) {
    return this.scoped(ctx, async (tx, clinicId) => {
      const where: Prisma.ProgramServiceWhereInput = { clinicId,
        ...(query.state === 'ALL' ? {} : { archivedAt: query.state === 'ARCHIVED' ? { not: null } : null }),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}), ...(query.audience ? { audience: query.audience } : {}),
        ...(query.search ? { OR: [{ programKey: { contains: query.search, mode: 'insensitive' } }, { draft: { path: ['title'], string_contains: query.search } }] } : {}) };
      const [rows, total] = await Promise.all([tx.programService.findMany({ where, orderBy: { id: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }), tx.programService.count({ where })]);
      await this.audit(tx, ctx, 'LIST_READ', clinicId);
      return { items: rows.map(serviceView), total, page: query.page, pageSize: query.pageSize };
    }, false);
  }
  get(id: string, ctx: Context) { return this.scoped(ctx, async (tx, clinicId) => { const row = await this.owned(tx, clinicId, id); await this.audit(tx, ctx, 'READ', id); return serviceView(row); }, false); }
  create(input: ProgramServiceCreateDto, ctx: Context) {
    return this.scoped(ctx, async (tx, clinicId) => {
      await this.lockIdentity(tx, clinicId, input.programKey, input.locale);
      const identity = { clinicId, programKey: input.programKey, locale: input.locale };
      const previous = await tx.programService.findUnique({ where: { clinicId_programKey_locale: identity } });
      let draft = JSON.parse(JSON.stringify(input.draft)) as Prisma.InputJsonObject;
      if (previous) { if (!isDeepStrictEqual(previous.draft, draft)) throw catalogConflict(); await this.audit(tx, ctx, 'READ', previous.id); return serviceView(previous); }
      if (await tx.programDefinitionVersion.count({ where: identity })) throw catalogConflict();
      const category = input.draft.category?.trim() ? await this.category(tx, clinicId, input.draft.category) : null;
      if (category) draft = { ...draft, category: category.name };
      const row = await tx.programService.create({ data: { ...identity, draft, categoryId: category?.id, audience: input.draft.audience ?? 'REVIEW_REQUIRED' } });
      await this.audit(tx, ctx, 'CREATED', row.id); return serviceView(row);
    });
  }
  save(id: string, input: ProgramDraftSaveDto, ctx: Context) {
    return this.scoped(ctx, async (tx, clinicId) => {
      const row = await this.owned(tx, clinicId, id, input.expectedRevision);
      const category = input.categoryId !== undefined ? (input.categoryId ? await tx.programServiceCategory.findFirst({ where: { id: input.categoryId, clinicId, active: true } }) : null) : input.draft.category?.trim() ? await this.category(tx, clinicId, input.draft.category) : null;
      if (input.categoryId && !category) throw catalogConflict();
      const saved = await tx.programService.update({ where: { id }, data: { draft: JSON.parse(JSON.stringify({ ...input.draft, category: category?.name ?? '' })), categoryId: category?.id ?? null, audience: input.draft.audience ?? row.audience, revision: { increment: 1 } } });
      await this.audit(tx, ctx, 'DRAFT_SAVED', id); return serviceView(saved);
    });
  }
  archive(id: string, revision: number, archived: boolean, ctx: Context) {
    return this.scoped(ctx, async (tx, clinicId) => {
      await this.owned(tx, clinicId, id, revision);
      const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
      const row = await tx.programService.update({ where: { id }, data: { archivedAt: archived ? clock.now : null, sellingEnabled: false, revision: { increment: 1 } } });
      await this.audit(tx, ctx, archived ? 'ARCHIVED' : 'RESTORED', id); return serviceView(row);
    });
  }
  async validateDraft(row: ProgramService) {
      const draft = row.draft as Prisma.JsonObject;
      const input = plainToInstance(ProgramDefinitionCreateDto, {
        programKey: row.programKey, locale: row.locale, kind: 'READY_EDUCATION',
        title: draft.title, summary: draft.summary, body: draft.body, category: draft.category,
        eligibilityDescription: draft.eligibilityDescription, safety: draft.safety, contentReferences: [],
      });
      if ((await validate(input, { whitelist: true, forbidNonWhitelisted: true })).length) {
        throw new UnprocessableEntityException({ code: 'PROGRAM_DRAFT_INCOMPLETE', message: 'Complete curriculum, eligibility and medical safety before submitting for review.', details: {} });
      }
      return input;
  }
  submit(id: string, revision: number, ctx: Context) { return this.scoped(ctx, async (tx, clinicId) => this.submitInTransaction(tx, await this.owned(tx, clinicId, id, revision), ctx)); }
  async submitInTransaction(tx: Tx, row: ProgramService, ctx: Context) {
      const input = await this.validateDraft(row);
      // Reuse an identical approved curriculum even when metadata alone changed.
      const latest = await tx.programDefinitionVersion.findFirst({ where: { clinicId: row.clinicId, programKey: row.programKey, locale: row.locale }, orderBy: { versionNumber: 'desc' } });
      const safety = { intendedAudience: input.safety?.intendedAudience?.trim() ?? '', limitations: input.safety?.limitations?.trim() ?? '', seekProfessionalCare: input.safety?.seekProfessionalCare?.trim() ?? '', contraindications: input.safety?.contraindications ?? [] };
      if (latest?.status === 'APPROVED' && latest.title === input.title.trim() && latest.summary === (input.summary?.trim() ?? '') && latest.body === input.body.trim() && latest.category === input.category.trim() && latest.eligibilityDescription === (input.eligibilityDescription?.trim() ?? '') && isDeepStrictEqual(latest.safety, safety)) return this.definitions.approveReadyByAdmin(tx, latest.id, ctx);
      const definition = await this.definitions.create(input, `service-submit:${row.id}:${row.revision}`, ctx, tx);
      await this.audit(tx, ctx, 'SUBMITTED', row.id);
      return this.definitions.approveReadyByAdmin(tx, definition.id, ctx);
  }
  categories(ctx: Context) { return this.scoped(ctx, async (tx, clinicId) => { const items = await tx.programServiceCategory.findMany({ where: { clinicId }, orderBy: { name: 'asc' } }); await this.audit(tx, ctx, 'CATEGORIES_READ', clinicId); return { items: items.map(({ clinicId: _, ...row }) => row) }; }, false); }
  createCategory(input: ProgramCategoryCreateDto, ctx: Context) {
    return this.scoped(ctx, async (tx, clinicId) => {
      if (await tx.programServiceCategory.count({ where: { clinicId, name: input.name.trim(), key: { not: input.key } } })) throw catalogConflict();
      const row = await tx.programServiceCategory.upsert({ where: { clinicId_key: { clinicId, key: input.key } }, create: { clinicId, key: input.key, name: input.name.trim() }, update: {} });
      if (row.name !== input.name.trim()) throw catalogConflict();
      await this.audit(tx, ctx, 'CATEGORY_CREATED', row.id); const { clinicId: _, ...view } = row; return view;
    });
  }
  saveCategory(id: string, input: ProgramCategorySaveDto, ctx: Context) {
    return this.scoped(ctx, async (tx, clinicId) => {
      // Lock in stable order when transferring services between categories.
      const ids = [...new Set([id, ...(input.reassignToId ? [input.reassignToId] : [])])].sort();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM program_service_categories WHERE clinic_id=${clinicId}::uuid AND id IN (${Prisma.join(ids.map(key => Prisma.sql`${key}::uuid`))}) ORDER BY id FOR UPDATE`);
      const row = await tx.programServiceCategory.findFirst({ where: { id, clinicId } });
      if (!row || row.revision !== input.expectedRevision) throw catalogConflict();
      if (await tx.programServiceCategory.count({ where: { clinicId, name: input.name.trim(), id: { not: id } } })) throw catalogConflict();
      if (!input.active && await tx.programService.count({ where: { clinicId, categoryId: id } })) {
        const target = input.reassignToId && input.reassignToId !== id ? await tx.programServiceCategory.findFirst({ where: { id: input.reassignToId, clinicId, active: true } }) : null;
        if (!target) throw catalogConflict();
        await tx.$executeRaw(Prisma.sql`UPDATE program_services SET category_id=${target.id}::uuid,draft=jsonb_set(draft,'{category}',to_jsonb(${target.name}::text)),revision=revision+1 WHERE clinic_id=${clinicId}::uuid AND category_id=${id}::uuid`);
      }
      const saved = await tx.programServiceCategory.update({ where: { id }, data: { name: input.name.trim(), active: input.active, revision: { increment: 1 } } });
      if (row.name !== saved.name) await tx.$executeRaw(Prisma.sql`UPDATE program_services SET draft=jsonb_set(draft,'{category}',to_jsonb(${saved.name}::text)),revision=revision+1 WHERE clinic_id=${clinicId}::uuid AND category_id=${id}::uuid`);
      await this.audit(tx, ctx, 'CATEGORY_SAVED', id); const { clinicId: _, ...view } = saved; return view;
    });
  }
}

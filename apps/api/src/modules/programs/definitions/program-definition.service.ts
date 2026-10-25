import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type ProgramDefinitionVersion } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { GuidanceContentService } from '../../content/guidance/guidance-content.service';
import type { GuidanceSafetyDto } from '../../content/guidance/guidance-content.dto';
import type { ProgramContentReferenceDto, ProgramDefinitionApprovalDto, ProgramDefinitionCreateDto, ProgramDefinitionQueryDto, ProgramDefinitionResponseDto, ProgramServiceSnapshotDto } from './program-definition.dto';
type Tx = Prisma.TransactionClient;
type Mode = 'admin' | 'doctor';
const missing = () => new NotFoundException({ code: 'PROGRAM_DEFINITION_NOT_FOUND', message: 'Program definition unavailable.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'PROGRAM_DEFINITION_INVALID', message: 'Program definition or its sources are inconsistent.', details: {} });
const conflict = () => new ConflictException({ code: 'PROGRAM_DEFINITION_CONFLICT', message: 'Program hash, source or lifecycle conflicts.', details: {} });
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
@Injectable()
export class ProgramDefinitionService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly content: GuidanceContentService) {}
  async create(input: ProgramDefinitionCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw invalid();
    const safety = { intendedAudience: input.safety.intendedAudience.trim(), limitations: input.safety.limitations.trim(), contraindications: input.safety.contraindications.map(s => s.trim()), seekProfessionalCare: input.safety.seekProfessionalCare.trim() };
    const definition = { programKey: input.programKey, locale: input.locale, kind: input.kind, title: input.title.trim(), summary: input.summary.trim(), category: input.category.trim(), body: input.body.trim(), eligibilityDescription: input.eligibilityDescription.trim(), safety, contentReferences: (input.contentReferences ?? []).map(r => ({ id: r.id.toLowerCase(), contentHash: r.contentHash })), doctorServiceId: input.doctorServiceId?.toLowerCase() ?? null };
    if (new Set(definition.contentReferences.map(r => r.id)).size !== definition.contentReferences.length || definition.kind === 'READY_EDUCATION' && definition.doctorServiceId || definition.kind === 'CUSTOM_PROFESSIONAL_PLAN' && !definition.doctorServiceId) throw invalid();
    const payloadHash = hash(definition);
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-command:' + ctx.actorUserId + ':' + key},0))`);
      const previous = await tx.programDefinitionVersion.findUnique({ where: { clinicId_createdByUserId_idempotencyKey: { clinicId, createdByUserId: ctx.actorUserId, idempotencyKey: key } } });
      if (previous) { if (previous.payloadHash !== payloadHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Command key already used for a different program.', details: {} }); await this.audit(tx, 'READ', previous.id, ctx); return this.response(tx, previous); }
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-version:' + clinicId + ':' + definition.programKey + ':' + definition.locale},0))`);
      const latest = await tx.programDefinitionVersion.findFirst({ where: { clinicId, programKey: definition.programKey, locale: definition.locale }, orderBy: { versionNumber: 'desc' }, select: { versionNumber: true, kind: true } }); if (latest && latest.kind !== definition.kind) throw invalid();
      const serviceSnapshot = definition.doctorServiceId ? await this.serviceSnapshot(tx, clinicId, definition.doctorServiceId) : null;
      await this.sources(tx, clinicId, definition.locale, definition.contentReferences);
      const row = await tx.programDefinitionVersion.create({ data: { ...definition, clinicId, serviceSnapshot: serviceSnapshot ? { ...serviceSnapshot } : Prisma.DbNull, contentHash: hash({ ...definition, serviceSnapshot }), versionNumber: (latest?.versionNumber ?? 0) + 1, createdByUserId: ctx.actorUserId, createdSessionId: ctx.actorSessionId, createdAt: await this.now(tx), idempotencyKey: key, payloadHash } });
      if (!await this.dependencies(tx, row.id)) throw invalid(); await this.audit(tx, 'CREATED', row.id, ctx); return this.response(tx, row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async list(query: ProgramDefinitionQueryDto, mode: Mode, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, mode, ctx), where = { clinicId, ...(query.programKey ? { programKey: query.programKey } : {}), ...(query.status ? { status: query.status } : {}) };
      const [rows, total] = await Promise.all([tx.programDefinitionVersion.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.programDefinitionVersion.count({ where })]);
      const states = rows.length ? await tx.$queryRaw<{ id: string; dependencies: boolean; usable: boolean }[]>(Prisma.sql`SELECT id,program_definition_dependencies(id) AS dependencies,program_definition_usable(id) AS usable FROM program_definition_versions WHERE id IN (${Prisma.join(rows.map(r => Prisma.sql`${r.id}::uuid`))})`) : [];
      await this.audit(tx, 'LIST_READ', clinicId, ctx); return { items: await Promise.all(rows.map(r => this.response(tx, r, states.find(state => state.id === r.id)))), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async get(id: string, mode: Mode, ctx: Context) { return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, mode, ctx), row = await this.owned(tx, id, clinicId); await this.audit(tx, 'READ', id, ctx); return this.response(tx, row); }, { isolationLevel: 'RepeatableRead', timeout: 15_000 }); }
  async approve(id: string, input: ProgramDefinitionApprovalDto, ctx: Context) {
    return this.change(id, 'doctor', ctx, async (tx, row, doctorId) => {
      if (input.contentHash !== row.contentHash || row.status === 'REVOKED') throw conflict();
      if (row.kind === 'CUSTOM_PROFESSIONAL_PLAN') await this.sources(tx, row.clinicId, row.locale, row.contentReferences as unknown as ProgramContentReferenceDto[]); if (row.doctorServiceId) await this.serviceSnapshot(tx, row.clinicId, row.doctorServiceId);
      if (!await this.dependencies(tx, id)) throw conflict();
      if (row.status === 'APPROVED') return row;
      const next = await tx.programDefinitionVersion.update({ where: { id }, data: { status: 'APPROVED', approvedByUserId: ctx.actorUserId, approvedDoctorId: doctorId, approvedSessionId: ctx.actorSessionId, approvedAt: await this.now(tx) } }); await this.audit(tx, 'APPROVED', id, ctx); return next;
    });
  }
  async revoke(id: string, mode: Mode, ctx: Context) {
    return this.change(id, mode, ctx, async (tx, row) => {
      if (mode === 'admin' && row.approvedAt) throw conflict(); if (row.status === 'REVOKED') return row;
      const next = await tx.programDefinitionVersion.update({ where: { id }, data: { status: 'REVOKED', revokedByUserId: ctx.actorUserId, revokedSessionId: ctx.actorSessionId, revokedAt: await this.now(tx) } }); await this.audit(tx, 'REVOKED', id, ctx); return next;
    });
  }
  private async change(id: string, mode: Mode, ctx: Context, action: (tx: Tx, row: ProgramDefinitionVersion, doctorId: string | null) => Promise<ProgramDefinitionVersion>) {
    return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, mode, ctx), doctorId = mode === 'doctor' ? await this.authority.doctor(tx, clinicId, ctx.actorUserId, true) : null;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM program_definition_versions WHERE id=${id}::uuid AND clinic_id=${clinicId}::uuid FOR UPDATE`); const row = await this.owned(tx, id, clinicId), next = await action(tx, row, doctorId); if (row.status === next.status) await this.audit(tx, 'READ', id, ctx); return this.response(tx, next);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  private async now(tx: Tx) { return (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now; }
  private async owned(tx: Tx, id: string, clinicId: string) { const row = await tx.programDefinitionVersion.findFirst({ where: { id, clinicId } }); if (!row) throw missing(); return row; }
  private async serviceSnapshot(tx: Tx, clinicId: string, id: string): Promise<ProgramServiceSnapshotDto> {
    const [row] = await tx.$queryRaw<ProgramServiceSnapshotDto[]>(Prisma.sql`SELECT ds.id,ds.doctor_id AS "doctorId",ds.service_id AS "serviceId",ds.visit_mode AS "visitMode",ds.duration_minutes AS "durationMinutes" FROM doctor_services ds JOIN doctor_profiles d ON d.id=ds.doctor_id AND d.clinic_id=ds.clinic_id JOIN services s ON s.id=ds.service_id AND s.clinic_id=ds.clinic_id WHERE ds.id=${id}::uuid AND ds.clinic_id=${clinicId}::uuid AND ds.is_active AND ds.publication_status='PUBLISHED' AND ds.published_at IS NOT NULL AND d.is_active AND d.publication_status='PUBLISHED' AND d.published_at IS NOT NULL AND s.is_active AND s.publication_status='PUBLISHED' AND s.published_at IS NOT NULL FOR SHARE OF ds,d,s`); if (!row) throw invalid(); return { id: row.id, doctorId: row.doctorId, serviceId: row.serviceId, visitMode: row.visitMode, durationMinutes: row.durationMinutes };
  }
  private async dependencies(tx: Tx, id: string) { const [row] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT program_definition_dependencies(${id}::uuid) AS allowed`); return !!row?.allowed; }
  private async sources(tx: Tx, clinicId: string, locale: string, refs: ProgramContentReferenceDto[]) {
    if (!refs.length) return;
    await tx.$queryRaw(Prisma.sql`SELECT id FROM guidance_content_versions WHERE id IN (${Prisma.join(refs.map(ref => Prisma.sql`${ref.id}::uuid`))}) AND clinic_id=${clinicId}::uuid ORDER BY id FOR SHARE`);
    const rows = await this.content.approvedVersions(tx, clinicId, refs.map(ref => ref.id)); if (rows.length !== refs.length || rows.some(row => row.locale !== locale || row.contentHash !== refs.find(ref => ref.id === row.id)?.contentHash)) throw invalid();
    for (const userId of [...new Set(rows.map(row => row.approvedByUserId!))].sort()) await this.authority.doctor(tx, clinicId, userId, true);
  }
  private async response(tx: Tx, row: ProgramDefinitionVersion, supplied?: { dependencies: boolean; usable: boolean }): Promise<ProgramDefinitionResponseDto> {
    const state = supplied ?? (await tx.$queryRaw<{ dependencies: boolean; usable: boolean }[]>(Prisma.sql`SELECT program_definition_dependencies(${row.id}::uuid) AS dependencies, program_definition_usable(${row.id}::uuid) AS usable`))[0];
    return { id: row.id, programKey: row.programKey, locale: row.locale, versionNumber: row.versionNumber, kind: row.kind, title: row.title, summary: row.summary, category: row.category, body: row.body, eligibilityDescription: row.eligibilityDescription, safety: row.safety as unknown as GuidanceSafetyDto, contentReferences: row.contentReferences as unknown as ProgramContentReferenceDto[], doctorServiceId: row.doctorServiceId, serviceSnapshot: row.serviceSnapshot as unknown as ProgramServiceSnapshotDto | null, contentHash: row.contentHash, status: row.status, dependenciesReady: !!state?.dependencies, usable: !!state?.usable, commercialReady: false, educationalOnly: row.kind === 'READY_EDUCATION', professionalReviewRequired: row.kind === 'CUSTOM_PROFESSIONAL_PLAN', createdAt: row.createdAt, approvedAt: row.approvedAt, revokedAt: row.revokedAt };
  }
  private async audit(tx: Tx, operation: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action: 'PROGRAM_DEFINITION_' + operation, subjectType: 'PROGRAM_DEFINITION', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}

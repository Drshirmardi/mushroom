import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '../../../generated/prisma/client';
import type { GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { SOURCE_FIELDS, mergeDraft, type Draft, type Resolution, type SourceField } from './catalog-merge';
import { ProgramCatalogBundle, type CatalogEntry } from './program-catalog.bundle';
import { catalogConflict, catalogInvalid, ProgramServicesService } from './program-services.service';
import { ProgramWorkingDraftDto, type CatalogApplyRequestDto, type CatalogPreviewRequestDto, type CatalogApplyResultDto } from './program-services.dto';

type SnapshotItem = { key: string; serviceId: string | null; expectedRevision: number | null; state: string; conflicts: string[]; current: Draft | null; incoming: Draft | null; entry: CatalogEntry | null; invalidReason?: string };
type Snapshot = { fields: SourceField[]; items: SnapshotItem[] };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const entryKey = (entry: CatalogEntry) => `${entry.programKey}:${entry.locale}`;

@Injectable()
export class ProgramCatalogService {
  constructor(private readonly services: ProgramServicesService, private readonly bundles: ProgramCatalogBundle) {}
  list(ctx: Context) {
    return this.services.scoped(ctx, async (tx, clinicId) => {
      const bundle = await this.bundles.load();
      await this.services.audit(tx, ctx, 'CATALOG_READ', clinicId);
      return { bundleHash: bundle.hash, items: bundle.entries.map(entry => ({ key: entryKey(entry), title: String(entry.draft.title), category: String(entry.draft.category), audience: String(entry.draft.audience), baseAmountRial: entry.baseAmountRial, catalogRole: entry.catalogRole ?? 'SERVICE', reviewRequired: entry.reviewRequired, sourceCount: entry.sources.length, ...(entry.invalidReason ? { invalidReason: entry.invalidReason } : {}) })) };
    }, false);
  }
  preview(input: CatalogPreviewRequestDto, ctx: Context) {
    return this.services.scoped(ctx, async (tx, clinicId) => {
      const bundle = await this.bundles.load(), fields = input.fields ?? [...SOURCE_FIELDS];
      const items: SnapshotItem[] = [];
      for (const key of input.entries) {
        const entry = bundle.entries.find(item => entryKey(item) === key) ?? null;
        const row = entry ? await tx.programService.findUnique({ where: { clinicId_programKey_locale: { clinicId, programKey: entry.programKey, locale: entry.locale } } }) : null;
        const current = row ? { ...(row.draft as Draft), audience: row.audience } : null;
        let state = 'INVALID', conflicts: string[] = [];
        if (entry && entry.catalogRole !== 'REFERENCE' && !entry.invalidReason && !(await validate(plainToInstance(ProgramWorkingDraftDto, entry.draft), { whitelist: true, forbidNonWhitelisted: true })).length) {
          if (!row) state = await tx.programDefinitionVersion.count({ where: { clinicId, programKey: entry.programKey, locale: entry.locale } }) ? 'INVALID' : 'NEW';
          else if (row.archivedAt) state = 'ARCHIVED';
          else { const merge = mergeDraft(row.importBaseline as Draft ?? {}, current ?? {}, entry.draft, fields); conflicts = merge.conflicts; state = conflicts.length ? 'CONFLICT' : merge.changed ? 'CHANGED' : 'UNCHANGED'; }
        }
        items.push({ key, serviceId: row?.id ?? null, expectedRevision: row?.revision ?? null, state, conflicts, current, incoming: entry?.draft ?? null, entry, ...(entry?.invalidReason ? { invalidReason: entry.invalidReason } : {}) });
      }
      const [clock] = await tx.$queryRaw<{ expires: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+INTERVAL '30 minutes' AS expires`);
      const preview = await tx.programImportPreview.create({ data: { clinicId, actorUserId: ctx.actorUserId, bundleHash: bundle.hash, snapshot: json({ fields, items }), expiresAt: clock.expires } });
      await this.services.audit(tx, ctx, 'IMPORT_PREVIEWED', preview.id);
      return { id: preview.id, bundleHash: bundle.hash, expiresAt: preview.expiresAt, items: items.map(({ entry: _, ...item }) => item) };
    }, false);
  }
  async apply(id: string, input: CatalogApplyRequestDto, ctx: Context) {
    if (new Set(input.items.map(item => item.key)).size !== input.items.length) throw catalogInvalid();
    const results: CatalogApplyResultDto[] = [];
    for (const item of input.items) {
      try {
        results.push(await this.services.scoped(ctx, async (tx, clinicId) => {
          // Serialize each preview item so a retried Apply returns its original receipt.
          await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-import:' + id + ':' + item.key},0))`);
          const preview = await tx.programImportPreview.findFirst({ where: { id, clinicId, actorUserId: ctx.actorUserId } });
          if (!preview) throw new NotFoundException({ code: 'PROGRAM_IMPORT_NOT_FOUND', message: 'Import preview unavailable.', details: {} });
          const resolutions: Resolution = {};
          for (const resolution of item.resolutions ?? []) {
            if (resolutions[resolution.field]) throw catalogInvalid();
            resolutions[resolution.field] = resolution.choice;
          }
          const payloadHash = createHash('sha256').update(JSON.stringify(Object.entries(resolutions).sort(([a], [b]) => a.localeCompare(b)))).digest('hex');
          const replay = await tx.programImportReceipt.findUnique({ where: { previewId_programKey: { previewId: id, programKey: item.key } } });
          if (replay) {
            if (replay.payloadHash !== payloadHash) throw catalogConflict();
            await this.services.audit(tx, ctx, 'IMPORT_REPLAYED', replay.id);
            return replay.result as unknown as CatalogApplyResultDto;
          }
          const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
          if (clock.now >= preview.expiresAt || (await this.bundles.load()).hash !== preview.bundleHash) throw catalogConflict();
          const snapshot = preview.snapshot as unknown as Snapshot, original = snapshot.items.find(value => value.key === item.key);
          if (!Array.isArray(snapshot.fields)) throw catalogInvalid();
          if (!original || !original.entry || original.state === 'INVALID') throw catalogInvalid();
          if (Object.keys(resolutions).some(field => !snapshot.fields.includes(field as SourceField))) throw catalogInvalid();
          const entry = original.entry;
          await this.services.lockIdentity(tx, clinicId, entry.programKey, entry.locale);
          let row = await tx.programService.findUnique({ where: { clinicId_programKey_locale: { clinicId, programKey: entry.programKey, locale: entry.locale } } });
          if ((row?.id ?? null) !== original.serviceId || (row?.revision ?? null) !== original.expectedRevision) throw catalogConflict();
          if (row) row = await this.services.owned(tx, clinicId, row.id, original.expectedRevision!);
          let result: CatalogApplyResultDto;
          if (row?.archivedAt) result = { key: item.key, state: 'SKIPPED', serviceId: row.id, code: 'PROGRAM_ARCHIVED' };
          else if (!row) {
            if (await tx.programDefinitionVersion.count({ where: { clinicId, programKey: entry.programKey, locale: entry.locale } })) throw catalogConflict();
            const category = await this.services.category(tx, clinicId, String(entry.draft.category));
            row = await tx.programService.create({ data: { clinicId, programKey: entry.programKey, locale: entry.locale, categoryId: category.id, audience: String(entry.draft.audience), baseAmountRial: BigInt(entry.baseAmountRial), draft: json({ ...entry.draft, category: category.name }), importBaseline: json(entry.draft), sourceReferences: json(entry.sources) } });
            result = { key: item.key, state: 'APPLIED', serviceId: row.id };
          } else {
            const baseline = row.importBaseline as Draft ?? {};
            const merge = mergeDraft(baseline, { ...(row.draft as Draft), audience: row.audience }, entry.draft, snapshot.fields, resolutions);
            if (merge.conflicts.length) throw catalogConflict();
            const category = snapshot.fields.includes('category') && typeof merge.draft.category === 'string' ? await this.services.category(tx, clinicId, merge.draft.category) : null;
            if (category) merge.draft.category = category.name;
            const nextBaseline = { ...baseline };
            for (const field of snapshot.fields) { if (entry.draft[field] === undefined) delete nextBaseline[field]; else nextBaseline[field] = entry.draft[field]; }
            await tx.programService.update({ where: { id: row.id }, data: { draft: json(merge.draft), importBaseline: json(nextBaseline), sourceReferences: json(entry.sources), ...(category ? { categoryId: category.id } : {}), ...(snapshot.fields.includes('audience') ? { audience: String(merge.draft.audience ?? 'REVIEW_REQUIRED') } : {}), revision: { increment: 1 } } });
            result = { key: item.key, state: merge.changed ? 'APPLIED' : 'UNCHANGED', serviceId: row.id };
          }
          const receipt = await tx.programImportReceipt.create({ data: { previewId: id, programKey: item.key, payloadHash, result: json(result) } });
          await this.services.audit(tx, ctx, 'IMPORTED', receipt.id);
          return result;
        }));
      } catch (error) {
        if (!(error instanceof HttpException) || error.getStatus() >= 500 || error.getStatus() === 401 || error.getStatus() === 403 || error.getStatus() === 404) throw error;
        const response = error.getResponse();
        results.push({ key: item.key, state: error.getStatus() === 409 ? 'CONFLICT' : 'INVALID', serviceId: null, code: typeof response === 'object' && 'code' in response ? String(response.code) : 'PROGRAM_IMPORT_FAILED' });
      }
    }
    return { items: results };
  }
}

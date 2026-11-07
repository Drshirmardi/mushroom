import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type ProgramOfferingPublication } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { moneyRial } from '../../billing/billing.policy';
import type { ProgramCommercialConfigDto, ProgramCommercialPolicyDto, ProgramPublicationQueryDto, ProgramPublicationResponseDto, PublishProgramOfferingDto } from './program-publication.dto';
import { ensureReadyProgramTerms, READY_PROGRAM_TERMS } from './ready-program-terms';
type Tx = Prisma.TransactionClient;
export const PROGRAM_COMMERCIAL_POLICY = Object.freeze({ schemaVersion: 1, ordinaryRefunds: false, paymentPoint: 'PRE_ACCESS_OR_REQUEST' } as const);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const missing = () => new NotFoundException({ code: 'PROGRAM_PUBLICATION_NOT_FOUND', message: 'Program commercial configuration unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'PROGRAM_PUBLICATION_CONFLICT', message: 'Program source, terms, price or publication changed.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'PROGRAM_PUBLICATION_INVALID', message: 'Explicit supported program commercial configuration required.', details: {} });
@Injectable()
export class ProgramPublicationService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService) {}
  async setup(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx);
      const definition = await this.definition(tx, clinicId, id);
      const [latest, terms, previous] = await Promise.all([
        this.latest(tx, definition),
        tx.consentPolicyVersion.findFirst({ where: { clinicId, locale: definition.locale, policyKey: 'PROGRAM_PURCHASE_TERMS', status: 'ACTIVE', activatedAt: { not: null } }, orderBy: { versionNumber: 'desc' } }),
        tx.programOfferingPublication.findFirst({ where: { clinicId, locale: definition.locale, definition: { kind: 'READY_EDUCATION' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { retentionPolicyRef: true } }),
      ]);
      await this.audit(tx, 'SETUP_READ', definition.id, ctx);
      return {
        defaultTerms: definition.kind === 'READY_EDUCATION' ? { title: READY_PROGRAM_TERMS.title, body: READY_PROGRAM_TERMS.body, versionNumber: READY_PROGRAM_TERMS.versionNumber } : null,
        latestPublication: latest ? await this.response(tx, latest) : null,
        termsPolicy: terms ? { id: terms.id, policyKey: 'PROGRAM_PURCHASE_TERMS' as const, versionNumber: terms.versionNumber, locale: terms.locale, title: terms.title, body: terms.body, contentHash: terms.contentHash } : null,
        suggestedRetentionPolicyRef: latest?.retentionPolicyRef ?? previous?.retentionPolicyRef ?? null,
      };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async preview(input: ProgramCommercialConfigDto, ctx: Context) {
    const requested = this.config(input);
    return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, 'admin', ctx), configuration = await this.resolveConfiguration(tx, clinicId, requested, ctx.actorUserId), source = await this.sources(tx, clinicId, configuration, false, input.expectedServiceRevision), latest = await this.latest(tx, source.definition);
      await this.audit(tx, 'PREVIEW_READ', source.definition.id, ctx); return { configuration, definition: { id: source.definition.id, programKey: source.definition.programKey, locale: source.definition.locale, kind: source.definition.kind, title: source.definition.title, contentHash: source.definition.contentHash, status: source.definition.status, usable: source.usable }, termsPolicy: source.terms ? { id: source.terms.id, policyKey: source.terms.policyKey as 'PROGRAM_PURCHASE_TERMS' | 'READY_PROGRAM_PURCHASE_TERMS', versionNumber: source.terms.versionNumber, locale: source.terms.locale, title: source.terms.title, body: source.terms.body, contentHash: source.terms.contentHash } : null, policy: PROGRAM_COMMERCIAL_POLICY, publicationHash: source.hash, expectedPublicationNumber: latest?.publicationNumber ?? 0, configurationReady: !source.blockers.length, blockers: source.blockers, checkoutAvailable: false as const };
    }, { isolationLevel: 'ReadCommitted', timeout: 15_000 });
  }
  async publish(input: PublishProgramOfferingDto, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key) || input.reviewedTermsAndRetention !== true) throw invalid(); const requested = this.config(input), payloadHash = hash({ expectedServiceRevision: input.expectedServiceRevision ?? null, configuration: requested, publicationHash: input.publicationHash, expectedPublicationNumber: input.expectedPublicationNumber, reviewedTermsAndRetention: true });
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'admin', ctx); await this.lock(tx, 'program-publication-command:' + ctx.actorUserId + ':' + key);
      const replay = await tx.programOfferingPublication.findUnique({ where: { clinicId_publishedByUserId_idempotencyKey: { clinicId, publishedByUserId: ctx.actorUserId, idempotencyKey: key } } }); if (replay) { if (replay.payloadHash !== payloadHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Command key already used for different publication.', details: {} }); await this.audit(tx, 'READ', replay.id, ctx); return this.response(tx, replay); }
      const configuration = await this.resolveConfiguration(tx, clinicId, requested, ctx.actorUserId);
      const definition = await this.definition(tx, clinicId, configuration.programDefinitionId); await this.lock(tx, this.identity(definition)); const latest = await this.latest(tx, definition); if ((latest?.publicationNumber ?? 0) !== input.expectedPublicationNumber) throw conflict();
      const source = await this.sources(tx, clinicId, configuration, true, input.expectedServiceRevision); if (source.blockers.length || !source.terms || !source.hash || source.hash !== input.publicationHash) throw conflict();
      const now = await this.time(tx, latest?.retiredAt ?? latest?.createdAt); if (latest?.status === 'ACTIVE') await this.retireRow(tx, latest, 'REPLACED', now, ctx);
      const row = await tx.programOfferingPublication.create({ data: { ...configuration, amountRial: moneyRial(configuration.amountRial, true), clinicId, programKey: definition.programKey, locale: definition.locale, definitionContentHash: definition.contentHash, publicationNumber: (latest?.publicationNumber ?? 0) + 1, termsContentHash: source.terms.contentHash, policySnapshot: PROGRAM_COMMERCIAL_POLICY, publicationHash: source.hash, publishedByUserId: ctx.actorUserId, publishedSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash, createdAt: now } }); await this.audit(tx, 'PUBLISHED', row.id, ctx); return this.response(tx, row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async list(query: ProgramPublicationQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, 'admin', ctx), where = { clinicId, ...(query.programKey ? { programKey: query.programKey } : {}), ...(query.status ? { status: query.status } : {}) };
      const [rows, total] = await Promise.all([tx.programOfferingPublication.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.programOfferingPublication.count({ where })]); const states = rows.length ? await tx.$queryRaw<{ id: string; ready: boolean }[]>(Prisma.sql`SELECT id,program_publication_current(id) AS ready FROM program_offering_publications WHERE id IN (${Prisma.join(rows.map(r => Prisma.sql`${r.id}::uuid`))})`) : []; await this.audit(tx, 'LIST_READ', clinicId, ctx); return { items: await Promise.all(rows.map(r => this.response(tx, r, states.find(state => state.id === r.id)?.ready))), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async get(id: string, ctx: Context) { return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, 'admin', ctx), row = await this.owned(tx, clinicId, id); await this.audit(tx, 'READ', id, ctx); return this.response(tx, row); }, { isolationLevel: 'RepeatableRead', timeout: 15_000 }); }
  async retire(id: string, ctx: Context) { return this.prisma.$transaction(async tx => { const clinicId = await this.authority.scope(tx, 'admin', ctx), initial = await this.owned(tx, clinicId, id); await this.lock(tx, this.identity(initial)); await tx.$queryRaw(Prisma.sql`SELECT id FROM program_offering_publications WHERE id=${id}::uuid AND clinic_id=${clinicId}::uuid FOR UPDATE`); const row = await this.owned(tx, clinicId, id); if (row.status === 'RETIRED') { await this.audit(tx, 'READ', id, ctx); return this.response(tx, row); } const next = await this.retireRow(tx, row, 'MANUAL', await this.time(tx, row.createdAt), ctx); await this.audit(tx, 'RETIRED', id, ctx); return this.response(tx, next); }, { maxWait: 30_000, timeout: 15_000 }); }
  private config(input: ProgramCommercialConfigDto) { moneyRial(input.amountRial, true); if (input.discountStartsAt && input.discountEndsAt && new Date(input.discountStartsAt) >= new Date(input.discountEndsAt)) throw invalid(); return { discountPercent: input.discountPercent ?? 0, discountStartsAt: input.discountStartsAt ? new Date(input.discountStartsAt).toISOString() : null, discountEndsAt: input.discountEndsAt ? new Date(input.discountEndsAt).toISOString() : null, programDefinitionId: input.programDefinitionId.toLowerCase(), termsPolicyVersionId: input.termsPolicyVersionId?.toLowerCase() ?? null, amountRial: input.amountRial, currency: input.currency, accessMode: input.accessMode, accessDurationDays: input.accessDurationDays ?? null, quoteTtlSeconds: input.quoteTtlSeconds, retentionPolicyRef: input.retentionPolicyRef ?? null }; }
  private async resolveConfiguration(tx: Tx, clinicId: string, requested: ReturnType<ProgramPublicationService['config']>, actorId: string) {
    if (requested.termsPolicyVersionId) return { ...requested, termsPolicyVersionId: requested.termsPolicyVersionId };
    const definition = await this.definition(tx, clinicId, requested.programDefinitionId);
    if (definition.kind !== 'READY_EDUCATION' || requested.accessMode !== 'PERPETUAL' || requested.accessDurationDays !== null) throw invalid();
    const terms = await ensureReadyProgramTerms(tx, clinicId, definition.locale, actorId);
    return { ...requested, termsPolicyVersionId: terms.id };
  }
  private async sources(tx: Tx, clinicId: string, config: ReturnType<ProgramPublicationService['config']> & { termsPolicyVersionId: string }, lock = false, expectedServiceRevision?: number) {
    const definition = await this.definition(tx, clinicId, config.programDefinitionId); if (definition.kind === 'READY_EDUCATION' && config.accessMode === 'ONE_DELIVERY' || definition.kind === 'CUSTOM_PROFESSIONAL_PLAN' && config.accessMode !== 'ONE_DELIVERY' || (config.accessMode === 'DAYS') !== (config.accessDurationDays !== null)) throw invalid();
    if (definition.kind === 'CUSTOM_PROFESSIONAL_PLAN' && (config.discountPercent || config.discountStartsAt || config.discountEndsAt)) throw invalid();
    if (definition.kind === 'CUSTOM_PROFESSIONAL_PLAN' && !config.retentionPolicyRef) throw invalid();
    let usable: boolean;
    if (lock) { usable = !!(await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT program_publication_lock_definition(${definition.id}::uuid) AS allowed`))[0]?.allowed; await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${config.termsPolicyVersionId}::uuid AND clinic_id=${clinicId}::uuid FOR SHARE`); }
    else usable = !!(await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT program_definition_usable(${definition.id}::uuid) AS allowed`))[0]?.allowed;
    if (lock && definition.kind === 'READY_EDUCATION') await tx.$queryRaw(Prisma.sql`SELECT id FROM program_services WHERE clinic_id=${clinicId}::uuid AND program_key=${definition.programKey} AND locale=${definition.locale} FOR SHARE`);
    const service = definition.kind === 'READY_EDUCATION' ? await tx.programService.findUnique({ where: { clinicId_programKey_locale: { clinicId, programKey: definition.programKey, locale: definition.locale } } }) : null;
    if (expectedServiceRevision !== undefined && service?.revision !== expectedServiceRevision) throw conflict();
    const blockers: string[] = []; if (!usable) blockers.push('PROGRAM_CLINICAL_DEFINITION_UNAVAILABLE');
    const terms = await tx.consentPolicyVersion.findFirst({ where: { id: config.termsPolicyVersionId, clinicId, locale: definition.locale, policyKey: { in: definition.kind === 'READY_EDUCATION' && config.accessMode === 'PERPETUAL' ? ['PROGRAM_PURCHASE_TERMS', READY_PROGRAM_TERMS.policyKey] : ['PROGRAM_PURCHASE_TERMS'] }, status: 'ACTIVE', activatedAt: { not: null } } }); if (!terms) blockers.push('PROGRAM_PURCHASE_TERMS_UNAVAILABLE');
    if (definition.kind === 'CUSTOM_PROFESSIONAL_PLAN') { const service = await tx.doctorService.findFirst({ where: { id: definition.doctorServiceId!, clinicId }, select: { priceAmount: true, currency: true } }); if (!service || service.currency !== 'IRR' || BigInt(service.priceAmount) !== moneyRial(config.amountRial, true)) blockers.push('CUSTOM_SERVICE_PRICE_CHANGED'); }
    return { definition, terms, usable, blockers, hash: !blockers.length && terms ? hash({ schemaVersion: 1, ...(service ? { serviceRevision: service.revision } : {}), configuration: config, definitionContentHash: definition.contentHash, termsContentHash: terms.contentHash, policy: PROGRAM_COMMERCIAL_POLICY }) : null };
  }
  private identity(row: { clinicId: string; programKey: string; locale: string }) { return `program-publication:${row.clinicId}:${row.programKey}:${row.locale}`; }
  private latest(tx: Tx, row: { clinicId: string; programKey: string; locale: string }) { return tx.programOfferingPublication.findFirst({ where: { clinicId: row.clinicId, programKey: row.programKey, locale: row.locale }, orderBy: { publicationNumber: 'desc' } }); }
  private async definition(tx: Tx, clinicId: string, id: string) { const row = await tx.programDefinitionVersion.findFirst({ where: { id, clinicId } }); if (!row) throw missing(); return row; }
  private async owned(tx: Tx, clinicId: string, id: string) { const row = await tx.programOfferingPublication.findFirst({ where: { id, clinicId } }); if (!row) throw missing(); return row; }
  private retireRow(tx: Tx, row: ProgramOfferingPublication, reason: string, now: Date, ctx: Context) { return tx.programOfferingPublication.update({ where: { id: row.id }, data: { status: 'RETIRED', retiredAt: now, retiredByUserId: ctx.actorUserId, retiredSessionId: ctx.actorSessionId, retirementReason: reason } }); }
  private async lock(tx: Tx, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`); }
  private async time(tx: Tx, since?: Date) { return (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${since ?? null}::timestamptz) AS now`))[0]!.now; }
  private async response(tx: Tx, row: ProgramOfferingPublication, supplied?: boolean): Promise<ProgramPublicationResponseDto> { const ready = supplied ?? !!(await tx.$queryRaw<{ ready: boolean }[]>(Prisma.sql`SELECT program_publication_current(${row.id}::uuid) AS ready`))[0]?.ready; return { discountPercent: row.discountPercent, discountStartsAt: row.discountStartsAt, discountEndsAt: row.discountEndsAt, id: row.id, programDefinitionId: row.programDefinitionId, definitionContentHash: row.definitionContentHash, programKey: row.programKey, locale: row.locale, publicationNumber: row.publicationNumber, amountRial: row.amountRial.toString(), currency: row.currency, priceMode: row.amountRial === 0n ? 'FREE' : 'PAID', accessMode: row.accessMode, accessDurationDays: row.accessDurationDays, quoteTtlSeconds: row.quoteTtlSeconds, retentionPolicyRef: row.retentionPolicyRef, termsPolicyVersionId: row.termsPolicyVersionId, termsContentHash: row.termsContentHash, policy: row.policySnapshot as unknown as ProgramCommercialPolicyDto, publicationHash: row.publicationHash, status: row.status, createdAt: row.createdAt, retiredAt: row.retiredAt, retirementReason: row.retirementReason, configurationReady: ready, checkoutAvailable: false }; }
  private async audit(tx: Tx, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action: 'PROGRAM_COMMERCIAL_' + action, subjectType: 'PROGRAM_COMMERCIAL', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}

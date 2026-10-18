import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type PatientConsentRecord, type PatientProfile } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { BillingService } from '../../billing/billing.service';
import { financialKey, fingerprint, lockFinancial, type Tx } from '../../billing/billing.policy';
import type { PreparedTarget } from '../../billing/billing-target.registry';
import type { ProgramConsentAcceptDto, ProgramPurchaseQueryDto } from './program-purchase.dto';

export const programMissing = () => new NotFoundException({ code: 'PROGRAM_PURCHASE_NOT_FOUND', message: 'Owned or available educational program unavailable.', details: {} });
export const programConflict = () => new ConflictException({ code: 'PROGRAM_PURCHASE_CONFLICT', message: 'Exact program source, terms, quote or access changed.', details: {} });
type ReadySnapshot = { schemaVersion: 1; purchaseId: string; publicationId: string; publicationHash: string; programDefinitionId: string; definitionContentHash: string; termsConsentRecordId: string; title: string; amountRial: string; currency: 'IRR'; accessMode: string; accessDurationDays: number | null };
type Snapshot = ReadySnapshot | (Omit<ReadySnapshot, 'schemaVersion'> & { schemaVersion: 2; customRequestId: string; careAuthorizationId: string });
const read = { intent: true, grant: true } satisfies Prisma.ProgramPurchaseInclude;

@Injectable()
export class ProgramPurchaseService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly billing: BillingService) {}
  patientIdentity(ctx: Context) { return this.prisma.$transaction(tx => this.patient(tx, ctx)); }
  async catalog(query: ProgramPurchaseQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx);
      // Retired legal versions must not cause repeated clinical-authority scans for old tariffs.
      const candidates = Prisma.sql`SELECT pub.id,pub.created_at FROM program_offering_publications pub JOIN program_definition_versions d ON d.id=pub.program_definition_id JOIN consent_policy_versions terms ON terms.id=pub.terms_policy_version_id WHERE pub.clinic_id=${p.clinicId}::uuid AND pub.status='ACTIVE' AND d.kind='READY_EDUCATION' AND terms.status='ACTIVE' AND terms.activated_at IS NOT NULL AND terms.content_hash=pub.terms_content_hash`;
      const ids = await tx.$queryRaw<{ id: string; total: bigint }[]>(Prisma.sql`WITH candidates AS MATERIALIZED (${candidates}) SELECT id,count(*) OVER() AS total FROM candidates WHERE program_publication_current(id) ORDER BY created_at DESC,id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`);
      const rows = ids.length ? await tx.programOfferingPublication.findMany({ where: { id: { in: ids.map(r => r.id) } }, include: { definition: true, terms: true } }) : [];
      const total = ids[0]?.total ?? (await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`WITH candidates AS MATERIALIZED (${candidates}) SELECT count(*) AS total FROM candidates WHERE program_publication_current(id)`))[0]!.total;
      const consents = await tx.patientConsentRecord.findMany({ where: { patientId: p.id, policyVersionId: { in: rows.map(r => r.termsPolicyVersionId) }, withdrawnAt: null } });
      await this.audit(tx, 'CATALOG_READ', p.id, ctx);
      return { items: ids.map(r => { const row = rows.find(v => v.id === r.id)!; return this.offeringView(row, consents.find(c => c.policyVersionId === row.termsPolicyVersionId)); }), total: Number(total), page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async offering(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx), row = await tx.programOfferingPublication.findFirst({ where: { id, clinicId: p.clinicId }, include: { definition: true, terms: true } });
      if (!row || row.definition.kind !== 'READY_EDUCATION' || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT program_publication_current(${id}::uuid) AS ok`))[0]?.ok) throw programMissing();
      const consent = await tx.patientConsentRecord.findFirst({ where: { patientId: p.id, policyVersionId: row.termsPolicyVersionId, withdrawnAt: null } });
      await this.audit(tx, 'OFFERING_READ', id, ctx); return this.offeringView(row, consent);
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async accept(body: ProgramConsentAcceptDto, rawKey: string | undefined, ctx: Context) {
    const key = 'program-consent:' + fingerprint(financialKey(rawKey)), policyId = body.policyVersionId.toLowerCase(), hash = fingerprint({ policyId, contentHash: body.contentHash, accepted: body.accepted });
    if (body.accepted !== true) throw programConflict();
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx); await lockFinancial(tx, `program-consent:${p.id}`);
      const old = await tx.walletCommand.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: ctx.actorUserId, idempotencyKey: key } } });
      if (old) { if (old.fingerprint !== hash) throw programConflict(); await this.audit(tx, 'CONSENT_READ', p.id, ctx); return old.response; }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${policyId}::uuid AND clinic_id=${p.clinicId}::uuid FOR SHARE`);
      const policy = await tx.consentPolicyVersion.findFirst({ where: { id: policyId, clinicId: p.clinicId, policyKey: 'PROGRAM_PURCHASE_TERMS', status: 'ACTIVE', activatedAt: { not: null } } });
      if (!policy || policy.contentHash !== body.contentHash || createHash('sha256').update(policy.body, 'utf8').digest('hex') !== policy.contentHash) throw programConflict();
      const existing = await tx.patientConsentRecord.findFirst({ where: { patientId: p.id, policyVersionId: policyId, withdrawnAt: null } });
      const now = await this.time(tx), record = existing ?? await tx.patientConsentRecord.create({ data: { patientId: p.id, policyVersionId: policyId, contentHash: policy.contentHash, acceptedByUserId: ctx.actorUserId, acceptedBySessionId: ctx.actorSessionId, acceptanceIdempotencyKey: key, acceptanceRequestId: ctx.requestId.slice(0, 128), acceptedAt: now, createdAt: now } });
      const response = this.consentView(record);
      await tx.walletCommand.create({ data: { actorUserId: ctx.actorUserId, idempotencyKey: key, fingerprint: hash, response } });
      await this.audit(tx, existing ? 'CONSENT_READ' : 'CONSENT_ACCEPTED', record.id, ctx); return response;
    }, { timeout: 15_000 });
  }
  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    if (input.customRequestId) return this.prepareCustom(patient, input);
    return this.prisma.$transaction(async tx => {
      const row = await tx.programOfferingPublication.findFirst({ where: { id: input.publicationId, clinicId: patient.clinicId }, include: { definition: true } });
      if (!row || row.definition.kind !== 'READY_EDUCATION' || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT program_publication_current(${row.id}::uuid) AS ok`))[0]?.ok) throw programMissing();
      if (row.publicationHash !== input.publicationHash) throw programConflict();
      const snapshot: Snapshot = { schemaVersion: 1, purchaseId: randomUUID(), publicationId: row.id, publicationHash: row.publicationHash, programDefinitionId: row.programDefinitionId, definitionContentHash: row.definitionContentHash, termsConsentRecordId: input.termsConsentRecordId!, title: row.definition.title, amountRial: row.amountRial.toString(), currency: 'IRR', accessMode: row.accessMode, accessDurationDays: row.accessDurationDays };
      const [time] = await tx.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+${row.quoteTtlSeconds}*INTERVAL '1 second' AS expiry`);
      return { amountRial: row.amountRial, snapshot, expiresAt: time!.expiry };
    });
  }
  async reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) {
    const s = prepared.snapshot as unknown as Snapshot;
    await lockFinancial(tx, `program-purchase:${patient.id}:${s.programDefinitionId}`);
    if (s.schemaVersion === 2) await lockFinancial(tx, `custom-program-request:${s.customRequestId}`);
    if (!await this.lockedPublication(tx, patient.clinicId, s.publicationId, false)) throw programConflict();
    const pub = await tx.programOfferingPublication.findUniqueOrThrow({ where: { id: s.publicationId } });
    if (pub.publicationHash !== s.publicationHash || pub.programDefinitionId !== s.programDefinitionId || pub.amountRial !== prepared.amountRial || !await this.patientProof(tx, patient) || !await this.terms(tx, patient.id, s.termsConsentRecordId, pub.termsPolicyVersionId, pub.termsContentHash)) throw programConflict();
    if (s.schemaVersion === 2 && !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_purchase_lock(${s.customRequestId}::uuid,${s.careAuthorizationId}::uuid,${s.publicationId}::uuid,${patient.id}::uuid,${patient.clinicId}::uuid,false) AS ok`))[0]?.ok) throw programConflict();
    const duplicate = (await tx.$queryRaw<{ ok: boolean }[]>(s.schemaVersion === 2 ? Prisma.sql`SELECT custom_program_request_live_purchase(${s.customRequestId}::uuid) AS ok` : Prisma.sql`SELECT program_has_live_purchase(${patient.id}::uuid,${s.programDefinitionId}::uuid) AS ok`))[0]?.ok;
    if (duplicate) throw programConflict();
    await tx.programPurchase.create({ data: { id: s.purchaseId, clinicId: patient.clinicId, patientId: patient.id, publicationId: pub.id, publicationHash: pub.publicationHash, programDefinitionId: s.programDefinitionId, termsConsentRecordId: s.termsConsentRecordId, amountRial: prepared.amountRial, snapshot: s, createdAt: await this.time(tx), ...(s.schemaVersion === 2 ? { customRequestId: s.customRequestId, careAuthorizationId: s.careAuthorizationId } : {}) } });
    return { kind: 'PROGRAM_PURCHASE' as const, purchaseId: s.purchaseId };
  }
  async canSettle(tx: Tx, intent: { programPurchaseId: string | null; patientId: string; clinicId: string; amountRial: bigint; expiresAt: Date | null }) {
    if (!intent.programPurchaseId || !intent.expiresAt) return false;
    const purchase = await tx.programPurchase.findFirst({ where: { id: intent.programPurchaseId, patientId: intent.patientId, clinicId: intent.clinicId } });
    if (purchase?.customRequestId) await lockFinancial(tx, `custom-program-request:${purchase.customRequestId}`);
    if (!purchase || purchase.amountRial !== intent.amountRial || (await tx.$queryRaw<{ expired: boolean }[]>(Prisma.sql`SELECT ${intent.expiresAt}::timestamptz<=CURRENT_TIMESTAMP AS expired`))[0]?.expired || !await this.lockedPublication(tx, intent.clinicId, purchase.publicationId, true)) return false;
    const pub = await tx.programOfferingPublication.findUniqueOrThrow({ where: { id: purchase.publicationId } }), p = await tx.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
    if (purchase.customRequestId) return await this.patientProof(tx, p) && await this.terms(tx, p.id, purchase.termsConsentRecordId, pub.termsPolicyVersionId, pub.termsContentHash) && !!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_purchase_lock(${purchase.customRequestId}::uuid,${purchase.careAuthorizationId}::uuid,${purchase.publicationId}::uuid,${p.id}::uuid,${p.clinicId}::uuid,true) AND NOT custom_program_request_paid(${purchase.customRequestId}::uuid) AS ok`))[0]?.ok;
    return await this.patientProof(tx, p) && await this.terms(tx, p.id, purchase.termsConsentRecordId, pub.termsPolicyVersionId, pub.termsContentHash) && !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM program_access_grants g JOIN program_purchases p ON p.id=g.purchase_id WHERE g.patient_id=${p.id}::uuid AND p.program_definition_id=${purchase.programDefinitionId}::uuid AND (g.ends_at IS NULL OR g.ends_at>CURRENT_TIMESTAMP)) AS ok`))[0]?.ok;
  }
  async list(query: ProgramPurchaseQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => { const p = await this.patient(tx, ctx), where = { patientId: p.id, clinicId: p.clinicId }, [rows, total] = await Promise.all([tx.programPurchase.findMany({ where, include: read, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.programPurchase.count({ where })]); await this.audit(tx, 'HISTORY_READ', p.id, ctx); return { items: await this.purchaseViews(tx, rows), total, page: query.page, pageSize: query.pageSize }; }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const p = await this.patient(tx, ctx), row = await tx.programPurchase.findFirst({ where: { id, patientId: p.id, clinicId: p.clinicId }, include: read }); if (!row) throw programMissing(); await this.audit(tx, 'PURCHASE_READ', id, ctx); return (await this.purchaseViews(tx, [row]))[0]!; }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async content(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx), grant = await tx.programAccessGrant.findFirst({ where: { id, patientId: p.id, clinicId: p.clinicId }, include: { purchase: true } }); if (!grant || grant.purchase.customRequestId) throw programMissing();
      if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT program_grant_readable(${id}::uuid,${p.id}::uuid) AS ok`))[0]?.ok || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT program_publication_lock_definition(${grant.purchase.programDefinitionId}::uuid) AS ok`))[0]?.ok) throw new ConflictException({ code: 'PROGRAM_ACCESS_UNAVAILABLE', message: 'Current owned educational access unavailable.', details: {} });
      const d = await tx.programDefinitionVersion.findUniqueOrThrow({ where: { id: grant.purchase.programDefinitionId } });
      await this.audit(tx, 'CONTENT_READ', id, ctx); return { id, grantedAt: grant.grantedAt, endsAt: grant.endsAt, accessAvailable: true, purchaseId: grant.purchaseId, programDefinitionId: d.id, versionNumber: d.versionNumber, contentHash: d.contentHash, title: d.title, body: d.body, safety: d.safety, contentReferences: d.contentReferences, educationalOnly: true as const };
    }, { timeout: 15_000 });
  }
  async patient(tx: Tx, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx), p = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId } }); if (p.clinicId !== clinicId || !await this.patientProof(tx, p)) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Current independent patient required.', details: {} }); return p; }
  private async prepareCustom(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    return this.prisma.$transaction(async tx => {
      const request = await tx.customProgramRequest.findFirst({ where: { id: input.customRequestId, patientId: patient.id, clinicId: patient.clinicId }, include: { publication: { include: { definition: true } }, careAuthorizations: { orderBy: { versionNumber: 'desc' }, take: 1 } } });
      if (!request || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_source_available(${request.publicationId}::uuid,true) AS ok`))[0]?.ok) throw programMissing();
      const pub = request.publication, care = request.careAuthorizations[0];
      if (pub.publicationHash !== input.publicationHash || !care || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_care_current(${care.id}::uuid) AND custom_program_doctor_ready(${request.doctorId}::uuid) AS ok`))[0]?.ok) throw programConflict();
      const snapshot: Snapshot = { schemaVersion: 2, purchaseId: randomUUID(), customRequestId: request.id, careAuthorizationId: care.id, publicationId: pub.id, publicationHash: pub.publicationHash, programDefinitionId: pub.programDefinitionId, definitionContentHash: pub.definitionContentHash, termsConsentRecordId: input.termsConsentRecordId!, title: pub.definition.title, amountRial: pub.amountRial.toString(), currency: 'IRR', accessMode: 'ONE_DELIVERY', accessDurationDays: null };
      const [clock] = await tx.$queryRaw<{ expiry: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+${pub.quoteTtlSeconds}*INTERVAL '1 second' AS expiry`);
      return { amountRial: pub.amountRial, snapshot, expiresAt: clock!.expiry };
    });
  }
  private async patientProof(tx: Tx, p: PatientProfile) { return (await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id=${p.id}::uuid AND p.clinic_id=${p.clinicId}::uuid AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' FOR SHARE OF p,u,c,ur,r`)).length > 0; }
  private async terms(tx: Tx, patientId: string, id: string, policyId: string, contentHash: string) { await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${id}::uuid FOR SHARE`); return !!await tx.patientConsentRecord.findFirst({ where: { id, patientId, policyVersionId: policyId, contentHash, withdrawnAt: null } }); }
  private async lockedPublication(tx: Tx, clinicId: string, id: string, quoted: boolean) {
    const p = await tx.programOfferingPublication.findFirst({ where: { id, clinicId } }); if (!p) return false;
    await lockFinancial(tx, `program-publication:${clinicId}:${p.programKey}:${p.locale}`);
    if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT program_publication_lock_definition(${p.programDefinitionId}::uuid) AS ok`))[0]?.ok) return false;
    await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${p.termsPolicyVersionId}::uuid FOR SHARE`);
    return !!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT CASE WHEN ${quoted} THEN program_publication_quoted(${id}::uuid) ELSE program_publication_current(${id}::uuid) END AS ok`))[0]?.ok;
  }
  private consentView(r: PatientConsentRecord) { return { id: r.id, policyVersionId: r.policyVersionId, contentHash: r.contentHash, acceptedAt: r.acceptedAt.toISOString() }; }
  private offeringView(r: Prisma.ProgramOfferingPublicationGetPayload<{ include: { definition: true; terms: true } }>, c?: PatientConsentRecord | null) { const d = r.definition; return { id: r.id, programDefinitionId: d.id, versionNumber: d.versionNumber, title: d.title, summary: d.summary, category: d.category, locale: d.locale, eligibilityDescription: d.eligibilityDescription, safety: d.safety, amountRial: r.amountRial.toString(), currency: r.currency, accessMode: r.accessMode, accessDurationDays: r.accessDurationDays, publicationHash: r.publicationHash, ordinaryRefunds: false as const, educationalOnly: true as const, availabilityCheckRequired: true as const, terms: { id: r.terms.id, title: r.terms.title, body: r.terms.body, contentHash: r.terms.contentHash }, termsConsent: c ? this.consentView(c) : null }; }
  private async purchaseViews(tx: Tx, rows: Prisma.ProgramPurchaseGetPayload<{ include: typeof read }>[]) {
    const ids = rows.flatMap(r => r.grant ? [r.grant.id] : []), states = ids.length ? await tx.$queryRaw<{ id: string; ok: boolean }[]>(Prisma.sql`SELECT id,program_grant_readable(id,patient_id) AS ok FROM program_access_grants WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})`) : [], allowed = new Set(states.filter(s => s.ok).map(s => s.id));
    return rows.map(r => { const g = r.grant; return { kind: r.customRequestId ? 'CUSTOM_PROFESSIONAL_PLAN' : 'READY_EDUCATION', customRequestId: r.customRequestId, id: r.id, publicationId: r.publicationId, programDefinitionId: r.programDefinitionId, title: (r.snapshot as unknown as Snapshot).title, amountRial: r.amountRial.toString(), currency: r.currency, createdAt: r.createdAt, intent: r.intent ? this.billing.view(r.intent) : null, grant: g ? { id: g.id, grantedAt: g.grantedAt, endsAt: g.endsAt, accessAvailable: allowed.has(g.id) } : null }; });
  }
  private async time(tx: Tx) { return (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now; }
  private async audit(tx: Tx, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action: 'PROGRAM_' + action, subjectType: 'PROGRAM_PURCHASE', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}

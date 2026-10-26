import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type ConsentPolicyVersion } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { financialKey, fingerprint, lockFinancial, type Tx } from '../../billing/billing.policy';
import type { CustomProgramCareAcceptDto, CustomProgramQueryDto, CustomProgramRequestCreateDto } from './custom-program.dto';

const missing = () => new NotFoundException({ code: 'CUSTOM_PROGRAM_NOT_FOUND', message: 'Owned request or available custom service unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'CUSTOM_PROGRAM_CONFLICT', message: 'Exact custom service, current care consent or request version changed.', details: {} });
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const boundary = { checkoutAvailable: false as const, clinicalDeliveryAvailable: false as const };
const requestRead = { publication: true, definition: true, doctor: true, careAuthorizations: { orderBy: { versionNumber: 'desc' as const }, take: 1, include: { careConsent: true } } } satisfies Prisma.CustomProgramRequestInclude;
const offeringRead = { definition: { include: { doctorService: { include: { doctor: true } } } }, terms: true } satisfies Prisma.ProgramOfferingPublicationInclude;
type RequestRow = Prisma.CustomProgramRequestGetPayload<{ include: typeof requestRead }>;
type OfferingRow = Prisma.ProgramOfferingPublicationGetPayload<{ include: typeof offeringRead }>;
type CareRow = Prisma.CustomProgramCareAuthorizationGetPayload<{ include: { careConsent: true } }>;

@Injectable()
export class CustomProgramService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService) {}
  async catalog(q: CustomProgramQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx);
      const candidates = Prisma.sql`SELECT pub.id,pub.created_at FROM program_offering_publications pub JOIN program_definition_versions d ON d.id=pub.program_definition_id JOIN consent_policy_versions t ON t.id=pub.terms_policy_version_id WHERE pub.clinic_id=${p.clinicId}::uuid AND pub.status='ACTIVE' AND d.kind='CUSTOM_PROFESSIONAL_PLAN' AND t.status='ACTIVE' AND t.activated_at IS NOT NULL AND t.content_hash=pub.terms_content_hash`;
      const ids = await tx.$queryRaw<{ id: string; total: bigint }[]>(Prisma.sql`WITH candidates AS MATERIALIZED (${candidates}) SELECT id,count(*) OVER() AS total FROM candidates WHERE program_publication_current(id) ORDER BY created_at DESC,id DESC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`);
      const total = ids[0]?.total ?? (await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`WITH candidates AS MATERIALIZED (${candidates}) SELECT count(*) AS total FROM candidates WHERE program_publication_current(id)`))[0]!.total;
      const rows = ids.length ? await tx.programOfferingPublication.findMany({ where: { id: { in: ids.map(r => r.id) } }, include: offeringRead }) : [];
      const policies = await this.policies(tx, p.clinicId, rows.map(r => r.locale));
      const available = await this.sourceStates(tx, rows.map(r => r.id), true);
      await this.audit(tx, 'CATALOG_READ', p.id, ctx);
      return { items: ids.map(r => this.offeringView(rows.find(v => v.id === r.id)!, policies, available.has(r.id))), total: Number(total), page: q.page, pageSize: q.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async offering(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx), row = await tx.programOfferingPublication.findFirst({ where: { id, clinicId: p.clinicId }, include: offeringRead });
      if (!row || row.definition.kind !== 'CUSTOM_PROFESSIONAL_PLAN' || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT program_publication_current(${id}::uuid) AS ok`))[0]?.ok) throw missing();
      const policies = await this.policies(tx, p.clinicId, [row.locale]), states = await this.sourceStates(tx, [id], true);
      await this.audit(tx, 'OFFERING_READ', id, ctx); return this.offeringView(row, policies, states.has(id));
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async create(body: CustomProgramRequestCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey), publicationId = body.publicationId.toLowerCase(), hash = fingerprint({ publicationId, publicationHash: body.publicationHash });
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx); await lockFinancial(tx, `custom-program-create:${p.id}:${key}`);
      const old = await tx.customProgramRequest.findUnique({ where: { patientId_idempotencyKey: { patientId: p.id, idempotencyKey: key } }, include: requestRead });
      if (old) { if (old.payloadHash !== hash) throw conflict(); await this.audit(tx, 'REQUEST_READ', old.id, ctx); return (await this.requestViews(tx, [old]))[0]!; }
      if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_lock_source(${publicationId}::uuid,true) AS ok`))[0]?.ok) throw missing();
      const pub = await tx.programOfferingPublication.findFirst({ where: { id: publicationId, clinicId: p.clinicId }, include: offeringRead });
      if (!pub || pub.publicationHash !== body.publicationHash || !pub.definition.doctorService) throw conflict();
      const policies = await this.policies(tx, p.clinicId, [pub.locale], true); if (!policies.length) throw conflict();
      const row = await tx.customProgramRequest.create({ data: { clinicId: p.clinicId, patientId: p.id, publicationId, publicationHash: pub.publicationHash, programDefinitionId: pub.programDefinitionId, definitionContentHash: pub.definitionContentHash, doctorServiceId: pub.definition.doctorService.id, doctorId: pub.definition.doctorService.doctorId, createdByUserId: ctx.actorUserId, createdSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash: hash, createdAt: await this.time(tx) }, include: requestRead });
      await this.audit(tx, 'REQUEST_CREATED', row.id, ctx); return (await this.requestViews(tx, [row]))[0]!;
    }, { timeout: 15_000 });
  }
  async list(q: CustomProgramQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => { const p = await this.patient(tx, ctx), where = { patientId: p.id, clinicId: p.clinicId }, [rows, total] = await Promise.all([tx.customProgramRequest.findMany({ where, include: requestRead, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.pageSize, skip: (q.page - 1) * q.pageSize }), tx.customProgramRequest.count({ where })]); await this.audit(tx, 'REQUEST_HISTORY_READ', p.id, ctx); return { items: await this.requestViews(tx, rows), total, page: q.page, pageSize: q.pageSize }; }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const p = await this.patient(tx, ctx), row = await this.owned(tx, id, p); await this.audit(tx, 'REQUEST_READ', id, ctx); return (await this.requestViews(tx, [row]))[0]!; }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async careHistory(requestId: string, q: CustomProgramQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx); await this.owned(tx, requestId, p);
      const where = { requestId, patientId: p.id, clinicId: p.clinicId }, [rows, total] = await Promise.all([tx.customProgramCareAuthorization.findMany({ where, include: { careConsent: true }, orderBy: { versionNumber: 'desc' }, take: q.pageSize, skip: (q.page - 1) * q.pageSize }), tx.customProgramCareAuthorization.count({ where })]);
      const states = await this.careStates(tx, rows.map(r => r.id)); await this.audit(tx, 'CARE_HISTORY_READ', requestId, ctx);
      return { items: rows.map(r => this.careView(r, states.has(r.id))), total, page: q.page, pageSize: q.pageSize };
    }, { isolationLevel: 'RepeatableRead', timeout: 15_000 });
  }
  async accept(requestId: string, body: CustomProgramCareAcceptDto, rawKey: string | undefined, ctx: Context) {
    requestId = requestId.toLowerCase();
    const key = financialKey(rawKey), command = 'custom-program-care-accept:' + fingerprint(key), policyId = body.policyVersionId.toLowerCase(), hash = fingerprint({ requestId, policyId, contentHash: body.contentHash, accepted: body.accepted, expectedVersionNumber: body.expectedVersionNumber });
    if (body.accepted !== true) throw conflict();
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx); await lockFinancial(tx, `custom-care-consent:${p.id}`); await lockFinancial(tx, `custom-program-command:${ctx.actorUserId}:${command}`); await lockFinancial(tx, `custom-program-request:${requestId}`);
      const r = await this.owned(tx, requestId, p), alias = await this.alias(tx, command, hash, p.id, requestId, ctx); if (alias) return alias;
      if (!(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_lock_source(${r.publicationId}::uuid,false) AND custom_program_request_source_current(${r.id}::uuid) AS ok`))[0]?.ok) throw conflict();
      const policy = (await this.policies(tx, p.clinicId, [r.definition.locale], true)).find(v => v.id === policyId && v.contentHash === body.contentHash); if (!policy) throw conflict();
      const latest = r.careAuthorizations[0];
      let row = latest && !latest.withdrawnAt && latest.careConsent.policyVersionId === policy.id && latest.careConsent.contentHash === policy.contentHash && !latest.careConsent.withdrawnAt ? latest : null;
      if (!row) {
        if ((latest?.versionNumber ?? 0) !== body.expectedVersionNumber) throw conflict();
        const now = await this.time(tx, latest?.withdrawnAt ?? latest?.acceptedAt);
        const consent = await tx.patientConsentRecord.findFirst({ where: { patientId: p.id, policyVersionId: policy.id, withdrawnAt: null } }) ?? await tx.patientConsentRecord.create({ data: { patientId: p.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: ctx.actorUserId, acceptedBySessionId: ctx.actorSessionId, acceptanceIdempotencyKey: command, acceptanceRequestId: ctx.requestId.slice(0, 128), acceptedAt: now, createdAt: now } });
        const acceptedAt = await this.time(tx, new Date(Math.max(now.getTime(), consent.acceptedAt.getTime())));
        if (latest && !latest.withdrawnAt) await tx.customProgramCareAuthorization.update({ where: { id: latest.id }, data: { withdrawnAt: acceptedAt, withdrawnByUserId: ctx.actorUserId, withdrawnSessionId: ctx.actorSessionId, withdrawalReason: 'SUPERSEDED', withdrawalIdempotencyKey: 'superseded:' + fingerprint(key) } });
        const versionNumber = (latest?.versionNumber ?? 0) + 1;
        row = await tx.customProgramCareAuthorization.create({ data: { clinicId: p.clinicId, patientId: p.id, requestId, versionNumber, careConsentRecordId: consent.id, authorizationHash: sha(`${requestId}:${consent.id}:${versionNumber}`), acceptedByUserId: ctx.actorUserId, acceptedSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash: hash, acceptedAt }, include: { careConsent: true } });
      }
      await this.saveAlias(tx, command, hash, requestId, row.id, ctx); await this.audit(tx, 'CARE_ACCEPTED', row.id, ctx);
      return this.careView(row, (await this.careStates(tx, [row.id])).has(row.id));
    }, { timeout: 15_000 });
  }
  async withdraw(requestId: string, id: string, rawKey: string | undefined, ctx: Context) {
    requestId = requestId.toLowerCase(); id = id.toLowerCase();
    const key = financialKey(rawKey), command = 'custom-program-care-withdraw:' + fingerprint(key), hash = fingerprint({ requestId, id });
    return this.prisma.$transaction(async tx => {
      const p = await this.patient(tx, ctx); await lockFinancial(tx, `custom-program-command:${ctx.actorUserId}:${command}`); await lockFinancial(tx, `custom-program-request:${requestId}`); await this.owned(tx, requestId, p);
      const alias = await this.alias(tx, command, hash, p.id, requestId, ctx); if (alias) return alias;
      let row = await tx.customProgramCareAuthorization.findFirst({ where: { id, requestId, patientId: p.id, clinicId: p.clinicId }, include: { careConsent: true } }); if (!row) throw missing();
      if (!row.withdrawnAt) row = await tx.customProgramCareAuthorization.update({ where: { id }, data: { withdrawnAt: await this.time(tx, row.acceptedAt), withdrawnByUserId: ctx.actorUserId, withdrawnSessionId: ctx.actorSessionId, withdrawalReason: 'PATIENT_WITHDRAWAL', withdrawalIdempotencyKey: 'patient:' + fingerprint(key) }, include: { careConsent: true } });
      await this.saveAlias(tx, command, hash, requestId, id, ctx); await this.audit(tx, 'CARE_WITHDRAWN', id, ctx); return this.careView(row, false);
    }, { timeout: 15_000 });
  }
  private async patient(tx: Tx, ctx: Context) {
    const clinicId = await this.authority.scope(tx, 'patient', ctx), p = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId } });
    if (p.clinicId !== clinicId || !(await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT custom_program_patient_session(${p.id}::uuid,${clinicId}::uuid,${ctx.actorUserId}::uuid,${ctx.actorSessionId}::uuid) AS ok`))[0]?.ok) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Current independent patient required.', details: {} });
    return p;
  }
  private async owned(tx: Tx, id: string, p: { id: string; clinicId: string }) { const row = await tx.customProgramRequest.findFirst({ where: { id, patientId: p.id, clinicId: p.clinicId }, include: requestRead }); if (!row) throw missing(); return row; }
  private async policies(tx: Tx, clinicId: string, locales: string[], lock = false) {
    if (!locales.length) return [];
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE clinic_id=${clinicId}::uuid AND policy_key='CUSTOM_PROGRAM_CARE' AND locale IN (${Prisma.join(locales)}) AND status='ACTIVE' ORDER BY id FOR SHARE`);
    return (await tx.consentPolicyVersion.findMany({ where: { clinicId, locale: { in: locales }, policyKey: 'CUSTOM_PROGRAM_CARE', status: 'ACTIVE', activatedAt: { not: null } } })).filter(p => sha(p.body) === p.contentHash);
  }
  private async sourceStates(tx: Tx, ids: string[], sale: boolean) { if (!ids.length) return new Set<string>(); return new Set((await tx.$queryRaw<{ id: string; ok: boolean }[]>(Prisma.sql`SELECT id,custom_program_source_available(id,${sale}) AS ok FROM program_offering_publications WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})`)).filter(r => r.ok).map(r => r.id)); }
  private async careStates(tx: Tx, ids: string[]) { if (!ids.length) return new Set<string>(); return new Set((await tx.$queryRaw<{ id: string; ok: boolean }[]>(Prisma.sql`SELECT id,custom_program_care_current(id) AS ok FROM custom_program_care_authorizations WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})`)).filter(r => r.ok).map(r => r.id)); }
  private policyView(p?: ConsentPolicyVersion) { return p ? { id: p.id, title: p.title, body: p.body, contentHash: p.contentHash } : null; }
  private blockers(source: boolean, policy: boolean) { return [...(!source ? ['CUSTOM_PROGRAM_SOURCE_UNAVAILABLE'] : []), ...(!policy ? ['CUSTOM_PROGRAM_CARE_POLICY_UNAVAILABLE'] : [])]; }
  private offeringView(r: OfferingRow, policies: ConsentPolicyVersion[], available: boolean) {
    const d = r.definition, ds = d.doctorService!, policy = policies.find(v => v.locale === r.locale);
    return { ...boundary, id: r.id, publicationHash: r.publicationHash, programDefinitionId: d.id, definitionContentHash: d.contentHash, title: d.title, summary: d.summary, category: d.category, locale: d.locale, eligibilityDescription: d.eligibilityDescription, safety: d.safety, doctorServiceId: ds.id, physician: { id: ds.doctor.id, displayName: ds.doctor.displayName }, amountRial: r.amountRial.toString(), currency: r.currency, ordinaryRefunds: false as const, terms: this.policyView(r.terms)!, carePolicy: this.policyView(policy), requestSupported: available && !!policy, blockers: ['CUSTOM_PROGRAM_REQUEST_REQUIRED', ...this.blockers(available, !!policy)] };
  }
  private careView(r: CareRow, current: boolean) { return { id: r.id, requestId: r.requestId, versionNumber: r.versionNumber, policyVersionId: r.careConsent.policyVersionId, contentHash: r.careConsent.contentHash, authorizationHash: r.authorizationHash, acceptedAt: r.acceptedAt, withdrawnAt: r.withdrawnAt, withdrawalReason: r.withdrawalReason, careAuthorized: current }; }
  private async requestViews(tx: Tx, rows: RequestRow[]) {
    if (!rows.length) return [];
    const policies = await this.policies(tx, rows[0]!.clinicId, rows.map(r => r.definition.locale)), source = await this.sourceStates(tx, rows.map(r => r.publicationId), false), states = await this.careStates(tx, rows.flatMap(r => r.careAuthorizations.map(a => a.id)));
    const ready = await tx.$queryRaw<{ id: string; sale: boolean; professional: boolean; paid: boolean; live: boolean; terms: boolean; body: boolean }[]>(Prisma.sql`SELECT r.id,program_publication_current(r.publication_id) AS sale,custom_program_doctor_ready(r.doctor_id) AS professional,custom_program_request_paid(r.id) AS paid,custom_program_request_live_purchase(r.id) AS live,EXISTS(SELECT 1 FROM patient_consent_records c JOIN program_offering_publications pub ON pub.id=r.publication_id WHERE c.patient_id=r.patient_id AND c.policy_version_id=pub.terms_policy_version_id AND c.content_hash=pub.terms_content_hash AND c.withdrawn_at IS NULL) AS terms,EXISTS(SELECT 1 FROM custom_program_plan_versions v WHERE v.request_id=r.id AND custom_program_native_effective(v.treatment_plan_id)) AS body FROM custom_program_requests r WHERE r.id IN (${Prisma.join(rows.map(r => Prisma.sql`${r.id}::uuid`))})`);
    return rows.map(r => { const policy = policies.find(p => p.locale === r.definition.locale), a = r.careAuthorizations[0], available = source.has(r.publicationId), state = ready.find(s => s.id === r.id)!, care = !!a && states.has(a.id); return { checkoutAvailable: available && state.sale && state.professional && care && state.terms && !state.live, clinicalDeliveryAvailable: state.body, id: r.id, publicationId: r.publicationId, publicationHash: r.publicationHash, programDefinitionId: r.programDefinitionId, definitionContentHash: r.definitionContentHash, title: r.definition.title, doctorServiceId: r.doctorServiceId, physician: { id: r.doctor.id, displayName: r.doctor.displayName }, amountRial: r.publication.amountRial.toString(), currency: r.publication.currency, createdAt: r.createdAt, sourceAvailable: available, carePolicy: this.policyView(policy), careAuthorization: a ? this.careView(a, care) : null, blockers: [...this.blockers(available, !!policy), ...(!care ? ['CUSTOM_PROGRAM_CARE_REQUIRED'] : []), ...(!state.professional ? ['CUSTOM_PROGRAM_PROFESSIONAL_UNAVAILABLE'] : []), ...(!state.paid && !state.sale ? ['CUSTOM_PROGRAM_NEW_SALE_UNAVAILABLE'] : []), ...(!state.paid && !state.terms ? ['PROGRAM_PURCHASE_TERMS_REQUIRED'] : [])] }; });
  }
  private async alias(tx: Tx, key: string, hash: string, patientId: string, requestId: string, ctx: Context) {
    const old = await tx.walletCommand.findUnique({ where: { actorUserId_idempotencyKey: { actorUserId: ctx.actorUserId, idempotencyKey: key } } }); if (!old) return null; if (old.fingerprint !== hash) throw conflict();
    const data = old.response as { requestId?: string; authorizationId?: string }; if (data.requestId !== requestId || !data.authorizationId) throw conflict();
    const row = await tx.customProgramCareAuthorization.findFirst({ where: { id: data.authorizationId, patientId, requestId }, include: { careConsent: true } }); if (!row) throw conflict();
    await this.audit(tx, 'CARE_READ', row.id, ctx); return this.careView(row, (await this.careStates(tx, [row.id])).has(row.id));
  }
  private async saveAlias(tx: Tx, key: string, hash: string, requestId: string, authorizationId: string, ctx: Context) { await tx.walletCommand.create({ data: { actorUserId: ctx.actorUserId, idempotencyKey: key, fingerprint: hash, response: { requestId, authorizationId } } }); }
  private async time(tx: Tx, floor?: Date | null) { return (await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${floor ?? null}::timestamptz) AS now`))[0]!.now; }
  private async audit(tx: Tx, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action: 'CUSTOM_PROGRAM_' + action, subjectType: 'CUSTOM_PROGRAM_REQUEST', subjectId: id, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}

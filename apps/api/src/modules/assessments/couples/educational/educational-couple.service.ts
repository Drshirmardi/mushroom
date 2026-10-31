import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../../content/guidance/guidance-authority.service';
import { financialKey, lockFinancial, pendingAttempts } from '../../../billing/billing.policy';
import { AssessmentAccessService } from '../../access/assessment-access.service';
import { canonicalAssessmentJson } from '../../domain/assessment-canonical-json';
import { adminPublicationHash } from '../../purchases/assessment-admin-purchase.service';
import { ClinicalAccessAuditService } from '../../../clinical/clinical-access-audit.service';
import type { EducationalCoupleAcceptDto, EducationalCoupleCreateDto, EducationalCoupleQueryDto } from './educational-couple.dto';

const missing = () => new NotFoundException({ code: 'COUPLE_ASSESSMENT_NOT_FOUND', message: 'Owned educational couple context unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'COUPLE_ASSESSMENT_CONFLICT', message: 'Exact linked beneficiaries, current source and independent acceptances required.', details: {} });
const hash = (value: unknown) => createHash('sha256').update(canonicalAssessmentJson(value)).digest('hex');
const include = { publication: { include: { offeringVersion: { include: { consentPolicies: true } } } }, participants: { include: { processingConsent: true, accessGrant: { include: { submission: { select: { id: true, state: true, invalidatedAt: true } } } } }, orderBy: { slot: 'asc' as const } } } as const;
type Row = Prisma.EducationalCoupleSessionGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class EducationalCoupleService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly access: AssessmentAccessService, private readonly clinicalAudit: ClinicalAccessAuditService) {}
  async create(body: EducationalCoupleCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey), payloadHash = hash({ ...body, coupleSessionId: body.coupleSessionId.toLowerCase(), publicationId: body.publicationId.toLowerCase() });
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      await lockFinancial(tx, `educational-couple-create:${patient.id}:${key}`);
      const prior = await tx.educationalCoupleSession.findUnique({ where: { createdByPatientId_idempotencyKey: { createdByPatientId: patient.id, idempotencyKey: key } }, include });
      if (prior) { if (prior.payloadHash !== payloadHash) throw conflict(); await this.audit(tx, 'COUPLE_ASSESSMENT_READ', prior.id, ctx); return this.project(prior, patient.id, await this.mutual(tx, prior.id), await this.isCurrent(tx, prior.publication.offeringVersionId)); }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_sessions WHERE id=${body.coupleSessionId}::uuid AND clinic_id=${patient.clinicId}::uuid FOR SHARE`);
      const link = await tx.coupleSession.findFirst({ where: { id: body.coupleSessionId, clinicId: patient.clinicId, state: 'LINKED', participants: { some: { patientId: patient.id, revokedAt: null } } }, include: { participants: true } });
      if (!link || link.participants.length !== 2 || link.participants.some(p => p.revokedAt)) throw missing();
      await lockFinancial(tx, `educational-couple-link:${link.id}:${body.publicationId.toLowerCase()}`);
      const publication = await tx.assessmentAdminPublication.findFirst({ where: { id: body.publicationId, status: 'ACTIVE', offeringVersion: { clinicId: patient.clinicId, kind: 'COUPLES', priceMode:'PAID',status: 'DRAFT', assessmentVersion: { status: 'PUBLISHED' } } }, include: { offeringVersion: { include: { assessmentVersion: true } } } });
      if (publication && !(await tx.$queryRaw<{ visible: boolean }[]>(Prisma.sql`SELECT assessment_publicly_available(${publication.offeringVersion.assessmentVersionId}::uuid) AS visible`))[0]?.visible) throw missing();
      if (!publication || adminPublicationHash(publication) !== body.publicationHash) throw conflict();
      const existing = await tx.educationalCoupleSession.findFirst({ where: { coupleSessionId: link.id, publicationId: publication.id }, orderBy:[{createdAt:'desc'},{id:'desc'}],include });
      if (existing && !existing.participants.every(p=>p.accessGrant?.submission?.state==='COMPLETE')) { await this.audit(tx, 'COUPLE_ASSESSMENT_READ', existing.id, ctx); return this.project(existing, patient.id, await this.mutual(tx, existing.id), await this.isCurrent(tx, existing.publication.offeringVersionId)); }
      if (!await this.isCurrent(tx, publication.offeringVersionId)) throw conflict();
      const snapshot = { schemaVersion: 1, coupleSessionId: link.id, publicationId: publication.id, questionnaireContentHash: publication.questionnaireContentHash };
      const id = randomUUID();
      await tx.educationalCoupleSession.create({ data: { id, clinicId: patient.clinicId, coupleSessionId: link.id, publicationId: publication.id, contextHash: hash(snapshot), contextSnapshot: snapshot, createdByPatientId: patient.id, createdSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash } });
      await tx.educationalCoupleParticipant.createMany({ data: link.participants.map(p => ({ sessionId: id, clinicId: patient.clinicId, patientId: p.patientId, slot: p.slot })) });
      const row = await tx.educationalCoupleSession.findUniqueOrThrow({ where: { id }, include });
      await this.audit(tx, 'COUPLE_ASSESSMENT_CREATED', id, ctx); return this.project(row, patient.id, false, true);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async list(query: EducationalCoupleQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx), where = { clinicId: patient.clinicId, participants: { some: { patientId: patient.id } }, ...(query.coupleSessionId ? { coupleSessionId: query.coupleSessionId } : {}) };
      const [rows, total] = await Promise.all([tx.educationalCoupleSession.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }), tx.educationalCoupleSession.count({ where })]);
      const proofs = rows.length ? await tx.$queryRaw<{ id: string; ready: boolean; current: boolean }[]>(Prisma.sql`SELECT id,educational_couple_mutual(id) AS ready,assessment_admin_offering_current((SELECT offering_version_id FROM assessment_admin_publications WHERE id=educational_couple_sessions.publication_id)) AND assessment_publicly_available((SELECT o.assessment_version_id FROM assessment_admin_publications p JOIN assessment_offering_versions o ON o.id=p.offering_version_id WHERE p.id=educational_couple_sessions.publication_id)) AS current FROM educational_couple_sessions WHERE id IN (${Prisma.join(rows.map(row => Prisma.sql`${row.id}::uuid`))})`) : [];
      const ready = new Set(proofs.filter(p => p.ready).map(p => p.id)), current = new Set(proofs.filter(p => p.current).map(p => p.id));
      await this.audit(tx, 'COUPLE_ASSESSMENT_LIST_READ', patient.id, ctx);
      return { items: rows.map(row => this.project(row, patient.id, ready.has(row.id), current.has(row.id))), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx), row = await this.owned(tx, id, patient);
      const docs = row.publication.offeringVersion.consentPolicies;
      const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
      const pending = await tx.billingIntent.findMany({ where: { purpose: 'ASSESSMENT', status: 'PENDING', assessmentPurchase: { educationalCoupleSessionId: id }, OR: [{ expiresAt: { gt: clock!.now } }, { attempts: { some: { status: { in: pendingAttempts } } } }] }, select: { id: true, patientId: true, expiresAt: true }, take: 20, orderBy: { createdAt: 'desc' } });
      const policy = (purpose: string) => { const p = docs.find(d => d.policyKey === purpose); if (!p) throw conflict(); return { id: p.id, policyKey: p.policyKey, versionNumber: p.versionNumber, locale: p.locale, title: p.title, body: p.body, contentHash: p.contentHash, status: p.status }; };
      await this.audit(tx, 'COUPLE_ASSESSMENT_READ', id, ctx);
      return { ...this.project(row, patient.id, await this.mutual(tx, id), await this.isCurrent(tx, row.publication.offeringVersionId)), ownPendingIntentId: pending.find(p => p.patientId === patient.id)?.id ?? null, paymentPending: pending.length > 0, processingPolicy: policy('ASSESSMENT_PROCESSING'), disclosurePolicy: policy('COUPLES_RESULT_SHARING'), termsPolicy: row.publication.offeringVersion.priceMode === 'PAID' ? policy('ASSESSMENT_PURCHASE_TERMS') : null };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async accept(id: string, body: EducationalCoupleAcceptDto, rawKey: string | undefined, ctx: Context) {
    financialKey(rawKey);
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx), row = await this.owned(tx, id, patient, true), self = row.participants.find(p => p.patientId === patient.id)!;
      if (body.contextHash !== row.contextHash || body.disclosureAccepted !== true || body.linkedPartnerAcknowledged !== true || body.disclosureContentHash !== (row.publication.documentHashes as Record<string, string>).COUPLES_RESULT_SHARING) throw conflict();
      if (self.acceptedAt) { if (self.processingConsentRecordId !== body.processingConsentRecordId.toLowerCase()) throw conflict(); }
      else {
        await this.lockSources(tx, row);
        await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${body.processingConsentRecordId}::uuid AND patient_id=${patient.id}::uuid FOR SHARE`);
        const [proof] = await tx.$queryRaw<{ current: boolean }[]>(Prisma.sql`SELECT educational_couple_current(${id}::uuid) AS current`);
        const processing = row.publication.offeringVersion.consentPolicies.find(p => p.policyKey === 'ASSESSMENT_PROCESSING');
        if (!proof?.current || !processing || !await tx.patientConsentRecord.count({ where: { id: body.processingConsentRecordId, patientId: patient.id, policyVersionId: processing.id, contentHash: processing.contentHash, withdrawnAt: null } })) throw conflict();
        await tx.educationalCoupleParticipant.update({ where: { id: self.id }, data: { processingConsentRecordId: body.processingConsentRecordId, disclosureContentHash: body.disclosureContentHash, acceptedSessionId: ctx.actorSessionId, acceptedAt: new Date() } });
      }
      await this.audit(tx, 'COUPLE_ASSESSMENT_CONSENT_ACCEPTED', id, ctx);
      const next = await tx.educationalCoupleSession.findUniqueOrThrow({ where: { id }, include }); return this.project(next, patient.id, await this.mutual(tx, id), await this.isCurrent(tx, next.publication.offeringVersionId));
    });
  }
  async withdraw(id: string, rawKey: string | undefined, ctx: Context) {
    financialKey(rawKey);
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx), row = await this.owned(tx, id, patient, true), self = row.participants.find(p => p.patientId === patient.id)!;
      if (!self.acceptedAt) throw conflict();
      if (!self.sharingWithdrawnAt) await tx.educationalCoupleParticipant.update({ where: { id: self.id }, data: { sharingWithdrawnAt: new Date(), withdrawnSessionId: ctx.actorSessionId } });
      await this.audit(tx, 'COUPLE_ASSESSMENT_CONSENT_WITHDRAWN', id, ctx);
      const next = await tx.educationalCoupleSession.findUniqueOrThrow({ where: { id }, include }); return this.project(next, patient.id, false, await this.isCurrent(tx, next.publication.offeringVersionId));
    });
  }
  async claimFree(id: string, rawKey: string | undefined, ctx: Context) {
    const key = financialKey(rawKey), payloadHash = hash({ sessionId: id.toLowerCase(), action: 'FREE_COUPLE_ACCESS' });
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx);
      await lockFinancial(tx, `assessment-free-command:${patient.id}:${key}`);
      const row = await this.owned(tx, id, patient, true), self = row.participants.find(p => p.patientId === patient.id)!;
      const command = await tx.assessmentFreeAccessCommand.findUnique({ where: { patientId_idempotencyKey: { patientId: patient.id, idempotencyKey: key } }, include: { grant: true } });
      if (command) {
        if (command.payloadHash !== payloadHash || command.grant.educationalCoupleParticipantId !== self.id) throw conflict();
        await this.audit(tx, 'ASSESSMENT_PURCHASE_READ', command.grantId, ctx);
        return { id: command.grantId, accessMode: 'FREE' as const, publicationId: row.publicationId, grantedAt: command.grant.grantedAt };
      }
      if (row.publication.offeringVersion.priceMode !== 'FREE') throw conflict();
      const sourceId = row.publication.offeringVersion.assessmentVersionId;
      await lockFinancial(tx, `assessment:start:${patient.id}:${sourceId}`);
      await lockFinancial(tx, `assessment-purchase:${patient.id}:${sourceId}`);
      await lockFinancial(tx, `assessment-protocol:${sourceId}`);
      await this.lockSources(tx, row);
      if (self.accessGrant) {
        await this.access.processingGrant(tx, self.accessGrant.id, patient, ctx);
        await tx.assessmentFreeAccessCommand.create({ data: { patientId: patient.id, idempotencyKey: key, payloadHash, grantId: self.accessGrant.id } });
        await this.audit(tx, 'ASSESSMENT_PURCHASE_READ', self.accessGrant.id, ctx);
        return { id: self.accessGrant.id, accessMode: 'FREE' as const, publicationId: row.publicationId, grantedAt: self.accessGrant.grantedAt };
      }
      throw new ConflictException({code:'ASSESSMENT_PAYMENT_REQUIRED',message:'New public attempts require payment.',details:{}});
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async result(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx), row = await this.owned(tx, id, patient, true);
      await this.lockSources(tx, row);
      if (!await this.mutual(tx, id) || row.participants.some(p => !p.accessGrant?.submission || p.accessGrant.submission.state !== 'COMPLETE' || p.accessGrant.submission.invalidatedAt)) throw missing();
      const ids = row.participants.map(p => p.accessGrant!.submission!.id);
      const results = await tx.patientAssessmentSubmission.findMany({ where: { id: { in: ids }, state: 'COMPLETE', invalidatedAt: null, assessmentVersionId: row.publication.offeringVersion.assessmentVersionId }, select: { id: true, resultSnapshot: true } });
      if (results.length !== 2) throw missing();
      const allowed = new Set(['snapshotVersion','status','primary','secondary','tiedDimensions','profile','scores','dimensionTitles','algorithmId','algorithmVersion','informativeAnswers','followUpUsed','score','resultBand']);
      const projected = row.participants.map(p => { const result = results.find(r => r.id === p.accessGrant!.submission!.id)!; return { slot: p.slot, isSelf: p.patientId === patient.id, resultSnapshot: Object.fromEntries(Object.entries(result.resultSnapshot as Record<string, unknown>).filter(([key]) => allowed.has(key))) }; });
      const profiles = projected.map(r => (r.resultSnapshot.profile as { id?: string } | null)?.id);
      const texts = (row.publication.offeringVersion.authoringTexts as { pairTexts?: { firstProfileId: string; secondProfileId: string; text: string }[] } | null)?.pairTexts ?? [];
      const pair = profiles.every(Boolean) ? texts.find(t => JSON.stringify([t.firstProfileId,t.secondProfileId].sort()) === JSON.stringify([...profiles].sort())) : null;
      await this.clinicalAudit.recordMany(row.participants.map(p => ({ clinicId: row.clinicId, patientId: p.patientId, action: 'READ' as const, resourceType: 'EDUCATIONAL_COUPLE_RESULT', resourceId: row.id, resourceRevisionId: p.accessGrant!.submission!.id, metadata: {} })), ctx, tx);
      await this.audit(tx, 'COUPLE_JOINT_RESULT_READ', id, ctx);
      return { results: projected, jointText: pair?.text ?? null };
    });
  }
  private async patient(tx: Tx, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx), patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId }, select: { id: true, clinicId: true } }); if (patient.clinicId !== clinicId) throw missing(); await this.access.self(tx, patient, ctx); return patient; }
  private async owned(tx: Tx, id: string, patient: { id: string; clinicId: string }, lock = false) { if (lock) await tx.$queryRaw(Prisma.sql`SELECT s.id FROM educational_couple_sessions s JOIN educational_couple_participants p ON p.session_id=s.id WHERE s.id=${id}::uuid AND s.clinic_id=${patient.clinicId}::uuid AND p.patient_id=${patient.id}::uuid FOR UPDATE OF s`); const row = await tx.educationalCoupleSession.findFirst({ where: { id, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } }, include }); if (!row) throw missing(); return row; }
  private async mutual(tx: Tx, id: string) { return !!(await tx.$queryRaw<{ ready: boolean }[]>(Prisma.sql`SELECT educational_couple_mutual(${id}::uuid) AS ready`))[0]?.ready; }
  private async lockSources(tx: Tx, row: Row) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_sessions WHERE id=${row.coupleSessionId}::uuid FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT pub.id FROM assessment_admin_publications pub JOIN assessment_offering_versions o ON o.id=pub.offering_version_id JOIN assessment_versions v ON v.id=o.assessment_version_id WHERE pub.id=${row.publicationId}::uuid FOR SHARE OF pub,o,v`);
    await tx.$queryRaw(Prisma.sql`SELECT p.id FROM consent_policy_versions p WHERE p.assessment_offering_version_id=${row.publication.offeringVersionId}::uuid ORDER BY id FOR SHARE`);
    const ids = row.participants.flatMap(p => p.processingConsentRecordId ? [p.processingConsentRecordId] : []);
    if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR SHARE`);
  }
  private async isCurrent(tx: Tx, offeringId: string) { return !!(await tx.$queryRaw<{ current: boolean }[]>(Prisma.sql`SELECT assessment_admin_offering_current(${offeringId}::uuid) AND assessment_publicly_available((SELECT assessment_version_id FROM assessment_offering_versions WHERE id=${offeringId}::uuid)) AS current`))[0]?.current; }
  private project(row: Row, selfId: string, mutual: boolean, newAccessAvailable: boolean) { const self = row.participants.find(p => p.patientId === selfId)!, offer = row.publication.offeringVersion; return { newAccessAvailable, id: row.id, coupleSessionId: row.coupleSessionId, publicationId: row.publicationId, contextHash: row.contextHash, title: offer.title, priceMode: offer.priceMode, amountRial: offer.amountRial!.toString(), currency: 'IRR', participants: row.participants.map(p => ({ slot: p.slot, isSelf: p.patientId === selfId, consentState: p.sharingWithdrawnAt || p.processingConsent?.withdrawnAt ? 'WITHDRAWN' : p.acceptedAt ? 'ACCEPTED' : 'PENDING' })), ownAccessGrantId: self.accessGrant?.id ?? null, ownSubmissionId: self.accessGrant?.submission?.id ?? null, ownProcessingConsentRecordId: self.processingConsentRecordId, mutualConsentComplete: mutual, jointResultAvailable: mutual && row.participants.every(p => p.accessGrant?.submission?.state === 'COMPLETE' && !p.accessGrant.submission.invalidatedAt) }; }
  private async audit(tx: Tx, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'EDUCATIONAL_COUPLE_ASSESSMENT', subjectId: id, requestId: ctx.requestId.slice(0,128), ipAddress: ctx.ipAddress, metadata: {} } }); }
}

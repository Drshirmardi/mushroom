import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../../content/guidance/guidance-authority.service';
import { AssessmentAccessService } from '../../access/assessment-access.service';
import { AssessmentPublicationService } from '../../publication/assessment-publication.service';
import { CoupleResultProtocolService } from '../result-protocol/couple-result-protocol.service';
import { coupleProtocolHash } from '../result-protocol/couple-result-protocol.definition';
import type { CoupleAssessmentConsentDto, CoupleAssessmentCreateDto, CoupleAssessmentQueryDto } from './couple-assessment.dto';

type Tx = Prisma.TransactionClient;
const include = { participants: { select: { id: true, patientId: true, slot: true, processingConsentRecordId: true, acceptedContextHash: true, acceptedAt: true, withdrawnAt: true, createdAt: true, processingConsent: { select: { id: true, patientId: true, policyVersionId: true, contentHash: true, withdrawnAt: true } } }, orderBy: { slot: 'asc' as const } }, link: { include: { participants: { select: { id: true, patientId: true, slot: true, revokedAt: true } } } }, publication: { include: { offeringVersion: true } } } satisfies Prisma.CoupleAssessmentSessionInclude;
type Row = Prisma.CoupleAssessmentSessionGetPayload<{ include: typeof include }>;
type Snapshot = { schemaVersion: 1; sessionId: string; coupleSessionId: string; publicationId: string; publicationHash: string; jointProtocolId: string; jointProtocolHash: string; assessmentVersionId: string; questionnaireContentHash: string; processingPolicyId: string; processingContentHash: string; disclosurePolicyId: string; disclosureContentHash: string; participants: { coupleParticipantId: string; patientId: string; slot: string }[] };
const missing = () => new NotFoundException({ code: 'COUPLE_ASSESSMENT_NOT_FOUND', message: 'Owned couple assessment context unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'COUPLE_ASSESSMENT_CONFLICT', message: 'Exact couple context, source or consent changed.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'COUPLE_ASSESSMENT_INVALID', message: 'Independent adult patients and explicit exact consent required.', details: {} });
const keyOf = (raw: string | undefined) => { const key = raw?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw invalid(); return key; };
const reused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Command key is already used.', details: {} });

@Injectable()
export class CoupleAssessmentService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly access: AssessmentAccessService, private readonly publications: AssessmentPublicationService, private readonly jointProtocols: CoupleResultProtocolService) {}

  async create(body: CoupleAssessmentCreateDto, rawKey: string | undefined, ctx: Context) {
    const key = keyOf(rawKey); const payloadHash = coupleProtocolHash({ ...body, coupleSessionId: body.coupleSessionId.toLowerCase(), publicationId: body.publicationId.toLowerCase(), jointProtocolId: body.jointProtocolId.toLowerCase() });
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.lock(tx, `couple-assessment-create:${patient.id}:${key}`);
      const prior = await tx.coupleAssessmentSession.findUnique({ where: { createdByPatientId_idempotencyKey: { createdByPatientId: patient.id, idempotencyKey: key } }, include });
      if (prior) { if (prior.payloadHash !== payloadHash) throw reused(); await this.audit(tx, 'COUPLE_ASSESSMENT_READ', prior.id, ctx); return this.project(prior, patient.id, await this.blockers(tx, prior)); }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_sessions WHERE id=${body.coupleSessionId}::uuid AND clinic_id=${patient.clinicId}::uuid FOR SHARE`);
      const link = await tx.coupleSession.findFirst({ where: { id: body.coupleSessionId, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } }, include: { participants: { orderBy: { slot: 'asc' } } } }); if (!link) throw missing();
      await this.lock(tx, `couple-assessment-link:${link.id}:${body.publicationId.toLowerCase()}`);
      if (link.state !== 'LINKED' || link.participants.length !== 2 || link.participants.some(p => p.revokedAt !== null) || !await this.liveAdults(tx, link.participants.map(p => p.patientId), patient.clinicId, true)) throw invalid();
      const pointer = await tx.assessmentOfferingPublication.findFirst({ where: { id: body.publicationId, clinicId: patient.clinicId }, include: { offeringVersion: true } }); if (!pointer) throw missing();
      if(!(await tx.$queryRaw<{visible:boolean}[]>(Prisma.sql`SELECT assessment_publicly_available(${pointer.offeringVersion.assessmentVersionId}::uuid) AS visible`))[0]?.visible)throw missing();
      await this.lock(tx, `assessment-publication:${patient.clinicId}:${pointer.offeringKey}`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${pointer.termsPolicyVersionId}::uuid FOR SHARE`);
      const joint = await this.jointProtocols.usable(tx, patient.clinicId, pointer.offeringVersion.assessmentVersionId, body.jointProtocolId, true);
      const publication = await this.publications.currentPublication(tx, patient.clinicId, pointer.id);
      if (!joint || !publication || publication.publicationHash !== body.publicationHash || joint.contentHash !== body.jointProtocolHash || publication.offeringVersion.kind !== 'COUPLES' || publication.protocolReviewId !== joint.protocolReviewId) throw conflict();
      if (await tx.coupleAssessmentSession.count({ where: { coupleSessionId: link.id, publicationId: publication.id, participants: { none: { withdrawnAt: { not: null } } } } })) throw conflict();
      const processingReview = await tx.assessmentProtocolReview.findUniqueOrThrow({ where: { id: joint.protocolReviewId } });
      const id = randomUUID(); const snapshot: Snapshot = { schemaVersion: 1, sessionId: id, coupleSessionId: link.id, publicationId: publication.id, publicationHash: publication.publicationHash, jointProtocolId: joint.id, jointProtocolHash: joint.contentHash, assessmentVersionId: joint.assessmentVersionId, questionnaireContentHash: joint.questionnaireContentHash, processingPolicyId: processingReview.consentPolicyVersionId, processingContentHash: processingReview.consentContentHash, disclosurePolicyId: joint.disclosurePolicyVersionId, disclosureContentHash: joint.disclosureContentHash, participants: link.participants.map(p => ({ coupleParticipantId: p.id, patientId: p.patientId, slot: p.slot })) };
      await tx.coupleAssessmentSession.create({ data: { id, clinicId: patient.clinicId, coupleSessionId: link.id, publicationId: publication.id, jointProtocolId: joint.id, assessmentVersionId: joint.assessmentVersionId, contextSnapshot: snapshot, contextHash: coupleProtocolHash(snapshot), createdByPatientId: patient.id, createdSessionId: ctx.actorSessionId, idempotencyKey: key, payloadHash } });
      await tx.coupleAssessmentParticipant.createMany({ data: link.participants.map(p => ({ sessionId: id, clinicId: patient.clinicId, patientId: p.patientId, coupleParticipantId: p.id, slot: p.slot })) });
      await this.audit(tx, 'COUPLE_ASSESSMENT_CREATED', id, ctx); const row = await tx.coupleAssessmentSession.findUniqueOrThrow({ where: { id }, include }); return this.project(row, patient.id, await this.blockers(tx, row));
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async list(query: CoupleAssessmentQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => { const patient = await this.patient(tx, ctx); const where = { clinicId: patient.clinicId, participants: { some: { patientId: patient.id } }, ...(query.coupleSessionId ? { coupleSessionId: query.coupleSessionId } : {}) };
      const rows = await tx.coupleAssessmentSession.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.pageSize, skip: (query.page - 1) * query.pageSize }); const total = await tx.coupleAssessmentSession.count({ where }); await this.audit(tx, 'COUPLE_ASSESSMENT_LIST_READ', patient.id, ctx); return { items: rows.map(row => this.project(row, patient.id, ['DETAIL_READINESS_REQUIRED'])), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const patient = await this.patient(tx, ctx); const row = await this.owned(tx, id, patient);
      const joint = await tx.coupleResultProtocolVersion.findUniqueOrThrow({ where: { id: row.jointProtocolId }, select: { protocolReview: { select: { consentPolicy: true } }, disclosurePolicy: true } });
      const policy = (p: typeof joint.disclosurePolicy) => ({ id: p.id, versionNumber: p.versionNumber, policyKey: p.policyKey, locale: p.locale, title: p.title, body: p.body, contentHash: p.contentHash, status: p.status }); await this.audit(tx, 'COUPLE_ASSESSMENT_READ', id, ctx); return { ...this.project(row, patient.id, await this.blockers(tx, row)), processingPolicy: policy(joint.protocolReview.consentPolicy), jointDisclosurePolicy: policy(joint.disclosurePolicy) }; }, { isolationLevel: 'RepeatableRead' });
  }
  async accept(id: string, body: CoupleAssessmentConsentDto, rawKey: string | undefined, ctx: Context) {
    const key = keyOf(rawKey); if (body.jointDisclosureAccepted !== true || body.linkedPartnerAcknowledged !== true) throw invalid();
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.lock(tx, `couple-assessment-accept:${patient.id}:${key}`); const row = await this.owned(tx, id, patient, true);
      const prior = await tx.coupleAssessmentParticipant.findUnique({ where: { patientId_acceptanceIdempotencyKey: { patientId: patient.id, acceptanceIdempotencyKey: key } } }); if (prior && prior.sessionId !== row.id) throw reused();
      const self = row.participants.find(p => p.patientId === patient.id)!;
      if (body.contextHash !== row.contextHash) throw conflict();
      if (self.acceptedAt) { if (self.processingConsentRecordId !== body.processingConsentRecordId.toLowerCase()) throw conflict(); await this.audit(tx, 'COUPLE_ASSESSMENT_READ', id, ctx); return this.project(row, patient.id, await this.blockers(tx, row)); }
      if (self.withdrawnAt || row.participants.some(p => p.withdrawnAt) || (await this.blockers(tx, row, true)).some(b => b !== 'MUTUAL_CONSENT_REQUIRED')) throw conflict();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${body.processingConsentRecordId}::uuid AND patient_id=${patient.id}::uuid FOR SHARE`);
      const snapshot = row.contextSnapshot as unknown as Snapshot;
      const medical = await tx.patientConsentRecord.findFirst({ where: { id: body.processingConsentRecordId, patientId: patient.id, policyVersionId: snapshot.processingPolicyId, contentHash: snapshot.processingContentHash, withdrawnAt: null } }); if (!medical) throw conflict();
      await tx.coupleAssessmentParticipant.update({ where: { id: self.id }, data: { processingConsentRecordId: medical.id, acceptedContextHash: row.contextHash, acceptedSessionId: ctx.actorSessionId, acceptanceIdempotencyKey: key, acceptedAt: await this.time(tx, self.createdAt) } });
      await this.audit(tx, 'COUPLE_ASSESSMENT_CONSENT_ACCEPTED', id, ctx); const next = await tx.coupleAssessmentSession.findUniqueOrThrow({ where: { id }, include }); return this.project(next, patient.id, await this.blockers(tx, next));
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async withdraw(id: string, rawKey: string | undefined, ctx: Context) {
    const key = keyOf(rawKey); return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.lock(tx, `couple-assessment-withdraw:${patient.id}:${key}`); const row = await this.owned(tx, id, patient, true);
      const prior = await tx.coupleAssessmentParticipant.findUnique({ where: { patientId_withdrawalIdempotencyKey: { patientId: patient.id, withdrawalIdempotencyKey: key } } }); if (prior && prior.sessionId !== row.id) throw reused(); const self = row.participants.find(p => p.patientId === patient.id)!;
      if (!self.withdrawnAt) await tx.coupleAssessmentParticipant.update({ where: { id: self.id }, data: { withdrawnAt: await this.time(tx, self.acceptedAt ?? self.createdAt), withdrawnSessionId: ctx.actorSessionId, withdrawalIdempotencyKey: key } });
      await this.audit(tx, self.withdrawnAt ? 'COUPLE_ASSESSMENT_READ' : 'COUPLE_ASSESSMENT_CONSENT_WITHDRAWN', id, ctx); const next = await tx.coupleAssessmentSession.findUniqueOrThrow({ where: { id }, include }); return this.project(next, patient.id, await this.blockers(tx, next));
    });
  }
  async mutualReady(tx: Tx, id: string, lock = false) {
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_assessment_sessions WHERE id=${id}::uuid FOR UPDATE`);
    const row = await tx.coupleAssessmentSession.findUnique({ where: { id }, include }); return row && !(await this.blockers(tx, row, lock)).length ? row : null;
  }
  async quotedMutualReady(tx: Tx, id: string, expiresAt: Date | null, lock = false) {
    const [time] = await tx.$queryRaw<{ expired: boolean }[]>(Prisma.sql`SELECT ${expiresAt}::timestamptz IS NULL OR ${expiresAt}::timestamptz<=CURRENT_TIMESTAMP AS expired`); if (time!.expired) return null;
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_assessment_sessions WHERE id=${id}::uuid FOR UPDATE`);
    const row = await tx.coupleAssessmentSession.findUnique({ where: { id }, include }); return row && !(await this.blockers(tx, row, lock, 'QUOTED')).length ? row : null;
  }
  async paidMutualReady(tx: Tx, id: string, lock = false) {
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_assessment_sessions WHERE id=${id}::uuid FOR UPDATE`);
    const row = await tx.coupleAssessmentSession.findUnique({ where: { id }, include }); if (!row) return null;
    const purchase = await tx.assessmentPurchase.findFirst({ where: { coupleAssessmentSessionId: id, clinicId: row.clinicId, intent: { purpose: 'ASSESSMENT', status: 'PAID' } }, include: { intent: true, grants: true } });
    if (!purchase || purchase.grants.length !== 2 || row.participants.some(p => !purchase.grants.some(g => g.coupleAssessmentParticipantId === p.id && g.patientId === p.patientId && g.processingConsentRecordId === p.processingConsentRecordId))) return null;
    return !(await this.blockers(tx, row, lock, 'PAID')).length ? { context: row, purchase } : null;
  }
  private async blockers(tx: Tx, row: Row, lock = false, mode: 'CURRENT' | 'QUOTED' | 'PAID' = 'CURRENT') {
    const codes: string[] = []; const snapshot = row.contextSnapshot as unknown as Snapshot;
    if (coupleProtocolHash(snapshot) !== row.contextHash) codes.push('CONTEXT_PROVENANCE_UNSUPPORTED');
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM couple_sessions WHERE id=${row.coupleSessionId}::uuid FOR SHARE`);
    const link = lock ? await tx.coupleSession.findUniqueOrThrow({ where: { id: row.coupleSessionId }, include: { participants: true } }) : row.link;
    if (link.state !== 'LINKED' || link.participants.length !== 2 || link.participants.some(p => p.revokedAt)) codes.push('LINK_CONSENT_UNAVAILABLE');
    if (!await this.liveAdults(tx, row.participants.map(p => p.patientId), row.clinicId, lock)) codes.push('PARTICIPANT_UNAVAILABLE');
    if (lock && mode !== 'PAID') { await this.lock(tx, `assessment-publication:${row.clinicId}:${row.publication.offeringKey}`); await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id=${row.publication.termsPolicyVersionId}::uuid FOR SHARE`); }
    const joint = await this.jointProtocols.usable(tx, row.clinicId, row.assessmentVersionId, row.jointProtocolId, lock);
    const publication = mode === 'PAID' ? row.publication : mode === 'QUOTED' ? await this.publications.quotedPublication(tx, row.clinicId, row.publicationId) : await this.publications.currentPublication(tx, row.clinicId, row.publicationId);
    if (!joint || joint.contentHash !== snapshot.jointProtocolHash || !publication || publication.publicationHash !== snapshot.publicationHash || publication.protocolReviewId !== joint.protocolReviewId) codes.push('EXACT_CONFIGURATION_UNAVAILABLE');
    if (lock) { const ids = row.participants.flatMap(p => p.processingConsentRecordId ? [p.processingConsentRecordId] : []); if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR SHARE`); }
    const participants = lock ? await tx.coupleAssessmentParticipant.findMany({ where: { sessionId: row.id }, include: { processingConsent: true } }) : row.participants;
    if (participants.some(p => p.withdrawnAt || p.processingConsent?.withdrawnAt)) codes.push('PARTICIPATION_CONSENT_WITHDRAWN');
    if (participants.length !== 2 || participants.some(p => !p.acceptedAt || !p.processingConsent || p.acceptedContextHash !== row.contextHash || p.processingConsent.policyVersionId !== snapshot.processingPolicyId || p.processingConsent.contentHash !== snapshot.processingContentHash)) codes.push('MUTUAL_CONSENT_REQUIRED');
    return codes;
  }
  private async liveAdults(tx: Tx, ids: string[], clinicId: string, lock: boolean) {
    if (ids.length !== 2 || new Set(ids).size !== 2) return false;
    const joinIds = Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`));
    const live = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT p.id FROM patient_profiles p JOIN users u ON u.id=p.user_id JOIN clinics c ON c.id=p.clinic_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE p.id IN (${joinIds}) AND p.clinic_id=${clinicId}::uuid AND u.status='ACTIVE' AND c.status='ACTIVE' AND r.code='PATIENT' ORDER BY p.id ${lock ? Prisma.sql`FOR SHARE OF p,u,c,ur,r` : Prisma.empty}`);
    if (live.length !== 2) return false;
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT i.id FROM patient_medical_intakes i JOIN patient_medical_intake_revisions r ON r.intake_id=i.id AND r.revision_number=i.current_revision_number WHERE i.patient_id IN (${joinIds}) ORDER BY i.patient_id FOR SHARE OF i,r`);
    const [row] = await tx.$queryRaw<{ adults: boolean }[]>(Prisma.sql`SELECT bool_and(couple_patient_is_adult(id)) AS adults FROM patient_profiles WHERE id IN (${joinIds})`); return row!.adults;
  }
  private async patient(tx: Tx, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx); const patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId }, select: { id: true, clinicId: true } }); if (patient.clinicId !== clinicId) throw missing(); await this.access.self(tx, patient, ctx); return patient; }
  private async owned(tx: Tx, id: string, patient: { id: string; clinicId: string }, lock = false) { if (lock) await tx.$queryRaw(Prisma.sql`SELECT s.id FROM couple_assessment_sessions s JOIN couple_assessment_participants p ON p.session_id=s.id WHERE s.id=${id}::uuid AND s.clinic_id=${patient.clinicId}::uuid AND p.patient_id=${patient.id}::uuid FOR UPDATE OF s`); const row = await tx.coupleAssessmentSession.findFirst({ where: { id, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } }, include }); if (!row) throw missing(); return row; }
  private async lock(tx: Tx, key: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`); }
  private async time(tx: Tx, since: Date) { const [row] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${since}::timestamptz) AS now`); return row!.now; }
  private async audit(tx: Tx, action: string, id: string, ctx: Context) { await tx.auditEvent.create({ data: { action, actorUserId: ctx.actorUserId, actorSessionId: ctx.actorSessionId, subjectType: 'COUPLE_ASSESSMENT', subjectId: id, requestId: ctx.requestId.slice(0, 128), ipAddress: ctx.ipAddress, metadata: {} } }); }
  private project(row: Row, selfId: string, blockers: string[]) { const self = row.participants.find(p => p.patientId === selfId)!; const consentComplete = blockers.length === 0 && row.participants.length === 2 && row.participants.every(p => p.acceptedAt && !p.withdrawnAt && p.processingConsent && !p.processingConsent.withdrawnAt); return { id: row.id, coupleSessionId: row.coupleSessionId, publicationId: row.publicationId, jointProtocolId: row.jointProtocolId, assessmentVersionId: row.assessmentVersionId, title: row.publication.offeringVersion.title, amountRial: row.publication.offeringVersion.amountRial!.toString(), currency: 'IRR', contextHash: row.contextHash, createdAt: row.createdAt, participants: row.participants.map(p => ({ slot: p.slot, isSelf: p.patientId === selfId, consentState: p.withdrawnAt || p.processingConsent?.withdrawnAt ? 'WITHDRAWN' : p.acceptedAt ? 'ACCEPTED' : 'PENDING' })), ownConsent: { processingConsentRecordId: self.processingConsentRecordId, acceptedAt: self.acceptedAt, withdrawnAt: self.withdrawnAt }, mutualConsentComplete: consentComplete, blockers }; }
}

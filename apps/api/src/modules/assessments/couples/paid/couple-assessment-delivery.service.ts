import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { Prisma, type CoupleAssessmentJointResult } from '../../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../../content/guidance/guidance-authority.service';
import { GuidanceContentService } from '../../../content/guidance/guidance-content.service';
import { ClinicalAccessAuditService } from '../../../clinical/clinical-access-audit.service';
import { AssessmentAccessService } from '../../access/assessment-access.service';
import { processableAssessmentGrants } from '../../access/assessment-access.policy';
import { assessmentResultProvenance } from '../../domain/assessment-result-provenance';
import { CoupleAssessmentService } from '../participation/couple-assessment.service';
import { AssessmentPublicationService } from '../../publication/assessment-publication.service';
import { CoupleResultProtocolService } from '../result-protocol/couple-result-protocol.service';
import { COUPLE_RESULT_ALGORITHM, coupleProtocolHash, selectCouplePair, type CoupleResultPair } from '../result-protocol/couple-result-protocol.definition';

type Tx = Prisma.TransactionClient;
type Reference = { id: string; contentHash: string };
type JointSnapshot = { snapshotVersion: 1; algorithmId: 'APPROVED_PAIR_LOOKUP'; algorithmVersion: 1; contextHash: string; jointProtocolHash: string; contentReferences: Reference[]; recommendConsultation: boolean };
type Metadata = { id: string; slot: string; state: string; completionPayloadHash: string | null; completedAt: Date | null; snapshot: Prisma.JsonValue };
const missing = () => new NotFoundException({ code: 'COUPLE_JOINT_RESULT_UNAVAILABLE', message: 'Mutually authorized joint education unavailable.', details: {} });
const notReady = () => new ConflictException({ code: 'COUPLE_JOINT_RESULT_NOT_READY', message: 'Both exact independently owned completed sources and current mutual approval required.', details: {} });

@Injectable()
export class CoupleAssessmentDeliveryService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly access: AssessmentAccessService, private readonly participation: CoupleAssessmentService, private readonly content: GuidanceContentService, private readonly clinicalAudit: ClinicalAccessAuditService, private readonly publications: AssessmentPublicationService, private readonly jointProtocols: CoupleResultProtocolService) {}

  async offering(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx), publication = await this.publications.currentPublication(tx, patient.clinicId, id);
      if (!publication || publication.offeringVersion.kind !== 'COUPLES') throw new NotFoundException({ code: 'ASSESSMENT_PURCHASE_NOT_FOUND', message: 'Available coupled offering not found.', details: {} });
      if(!(await tx.$queryRaw<{visible:boolean}[]>(Prisma.sql`SELECT assessment_publicly_available(${publication.offeringVersion.assessmentVersionId}::uuid) AS visible`))[0]?.visible)throw missing();
      const joint = await this.jointProtocols.usable(tx, patient.clinicId, publication.offeringVersion.assessmentVersionId);
      const [age] = await tx.$queryRaw<{ adult: boolean }[]>(Prisma.sql`SELECT couple_patient_is_adult(${patient.id}::uuid) AS adult`);
      const blockers = [...(!age?.adult ? ['ADULT_BIRTH_DATE_REQUIRED'] : []), ...(!joint || joint.protocolReviewId !== publication.protocolReviewId ? ['JOINT_CONFIGURATION_UNAVAILABLE'] : [])];
      await this.clinicalAudit.record({ clinicId: patient.clinicId, patientId: patient.id, action: 'READ', resourceType: 'COUPLE_ASSESSMENT_OFFERING', resourceId: id, metadata: {} }, ctx, tx);
      return { publicationId: publication.id, publicationHash: publication.publicationHash, title: publication.offeringVersion.title, amountRial: publication.offeringVersion.amountRial!.toString(), currency: 'IRR', assessmentVersionId: publication.offeringVersion.assessmentVersionId, jointProtocolId: blockers.length ? null : joint!.id, jointProtocolHash: blockers.length ? null : joint!.contentHash, available: blockers.length === 0, blockers };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async owned(id: string, ctx: Context) { return this.prisma.$transaction(async tx => { const patient = await this.patient(tx, ctx); await this.context(tx, id, patient); return patient; }); }
  async home(tx: Tx, patient: { id: string; clinicId: string }) {
    type HomeRow = { id: string; title: string; paymentState: string; ownAccessGrantId: string | null; ownSubmissionId: string | null; ownAssessmentState: string | null; ownStartAvailable: boolean; jointResultState: string; jointResultId: string | null };
    const selection = Prisma.sql`
      SELECT s.id,offer.title,COALESCE(receipt.status,'UNPAID') AS "paymentState",g.id AS "ownAccessGrantId",attempt.id AS "ownSubmissionId",CASE WHEN g.id IS NULL THEN NULL ELSE COALESCE(attempt.state::text,'NOT_STARTED') END AS "ownAssessmentState",
       (g.id IS NOT NULL AND attempt.id IS NULL AND assessment_grant_processable(g.id)) AS "ownStartAvailable",
       CASE WHEN receipt.status IS DISTINCT FROM 'PAID' THEN 'AWAITING_PAYMENT' WHEN NOT sharing.allowed THEN 'SHARING_UNAVAILABLE' WHEN result.id IS NOT NULL THEN 'AVAILABLE' WHEN (SELECT count(*) FROM assessment_access_grants both_grants JOIN patient_assessment_submissions done ON done.access_grant_id=both_grants.id WHERE both_grants.purchase_id=receipt.id AND done.state='COMPLETE' AND done.invalidated_at IS NULL)=2 THEN 'READY_TO_GENERATE' ELSE 'AWAITING_COMPLETION' END AS "jointResultState",
       CASE WHEN sharing.allowed THEN result.id ELSE NULL END AS "jointResultId"
      FROM couple_assessment_sessions s JOIN couple_assessment_participants self ON self.session_id=s.id AND self.patient_id=${patient.id}::uuid
      JOIN patient_profiles owner ON owner.id=self.patient_id JOIN users u ON u.id=owner.user_id JOIN clinics clinic ON clinic.id=owner.clinic_id
      JOIN assessment_offering_publications pub ON pub.id=s.publication_id JOIN assessment_offering_versions offer ON offer.id=pub.offering_version_id
      LEFT JOIN LATERAL(SELECT p.id,i.status FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.couple_assessment_session_id=s.id ORDER BY (i.status='PAID') DESC,p.created_at DESC,p.id DESC LIMIT 1) receipt ON true
      LEFT JOIN assessment_access_grants g ON g.purchase_id=receipt.id AND g.patient_id=self.patient_id AND assessment_grant_readable(g.id,self.patient_id)
      LEFT JOIN patient_assessment_submissions attempt ON attempt.access_grant_id=g.id
      LEFT JOIN couple_assessment_joint_results result ON result.session_id=s.id
      CROSS JOIN LATERAL(SELECT couple_assessment_paid_sharing_allowed(s.id) AS allowed OFFSET 0) sharing
      WHERE s.clinic_id=${patient.clinicId}::uuid AND owner.clinic_id=s.clinic_id AND clinic.status='ACTIVE' AND u.status='ACTIVE' AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='PATIENT')`;
    const rows = await tx.$queryRaw<HomeRow[]>(Prisma.sql`${selection} ORDER BY s.created_at DESC,s.id DESC LIMIT 6`);
    // Select a pending category independently of the capped historical preview.
    const [pending] = await tx.$queryRaw<HomeRow[]>(Prisma.sql`SELECT * FROM (${selection}) available WHERE "ownStartAvailable" OR "ownAssessmentState"='IN_PROGRESS' OR "jointResultState"='READY_TO_GENERATE' OR "paymentState"='PENDING' ORDER BY id DESC LIMIT 1`);
    const [ready] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT s.id FROM couple_assessment_sessions s JOIN couple_assessment_participants self ON self.session_id=s.id AND self.patient_id=${patient.id}::uuid WHERE s.clinic_id=${patient.clinicId}::uuid AND couple_assessment_paid_sharing_allowed(s.id) AND NOT EXISTS(SELECT 1 FROM couple_assessment_joint_results WHERE session_id=s.id) AND EXISTS(SELECT 1 FROM assessment_purchases p JOIN billing_intents i ON i.assessment_purchase_id=p.id WHERE p.couple_assessment_session_id=s.id AND i.status='PAID' AND (SELECT count(*) FROM assessment_access_grants g JOIN patient_assessment_submissions completed ON completed.access_grant_id=g.id WHERE g.purchase_id=p.id AND completed.state='COMPLETE' AND completed.invalidated_at IS NULL)=2) ORDER BY s.created_at DESC,s.id DESC LIMIT 1`);
    return { rows, readyId: ready?.id, pending };
  }
  async state(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.context(tx, id, patient);
      const paid = await this.participation.paidMutualReady(tx, id);
      const purchase = await tx.assessmentPurchase.findFirst({ where: { coupleAssessmentSessionId: id }, include: { intent: true, grants: { include: { submission: { select: { id: true, state: true, invalidatedAt: true } }, processingConsent: { select: { withdrawnAt: true } } } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      const settled = await tx.assessmentPurchase.findFirst({ where: { coupleAssessmentSessionId: id, intent: { status: 'PAID' } }, include: { intent: true, grants: { include: { submission: { select: { id: true, state: true, invalidatedAt: true } }, processingConsent: { select: { withdrawnAt: true } } } } } });
      const receipt = settled ?? purchase; const own = receipt?.intent?.status === 'PAID' ? receipt.grants.find(g => g.patientId === patient.id && !g.processingConsent.withdrawnAt) : undefined;
      const partner = paid ? receipt?.grants.find(g => g.patientId !== patient.id) : undefined;
      const result = paid ? await tx.coupleAssessmentJointResult.findUnique({ where: { sessionId: id }, select: { id: true } }) : null;
      const complete = !!paid && receipt?.grants.length === 2 && receipt.grants.every(g => g.submission?.state === 'COMPLETE' && !g.submission.invalidatedAt);
      const processable = own ? (await processableAssessmentGrants(tx, [own.id])).has(own.id) : false;
      await this.clinicalAudit.record({ clinicId: patient.clinicId, patientId: patient.id, action: 'READ', resourceType: 'COUPLE_ASSESSMENT_DELIVERY_STATE', resourceId: id, metadata: {} }, ctx, tx);
      return { coupleAssessmentId: id, paymentState: receipt?.intent?.status ?? 'UNPAID', ownIntentId: receipt?.patientId === patient.id ? receipt.intent?.id ?? null : null, ownPurchaseId: receipt?.patientId === patient.id ? receipt.id : null, ownAccessGrantId: own?.id ?? null, ownSubmissionId: own?.submission?.id ?? null, ownAssessmentState: own ? own.submission?.state ?? 'NOT_STARTED' : null, ownStartAvailable: !!own && !own.submission && processable, partnerCompletion: !paid ? 'UNAVAILABLE' : partner?.submission?.state === 'COMPLETE' && !partner.submission.invalidatedAt ? 'COMPLETE' : 'PENDING', jointResultState: receipt?.intent?.status !== 'PAID' ? 'AWAITING_PAYMENT' : !paid ? 'SHARING_UNAVAILABLE' : result ? 'AVAILABLE' : complete ? 'READY_TO_GENERATE' : 'AWAITING_COMPLETION', jointResultId: result?.id ?? null };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async generate(id: string, rawKey: string | undefined, ctx: Context) {
    const key = rawKey?.trim(); if (!key || !/^[\x21-\x7e]{8,200}$/u.test(key)) throw new UnprocessableEntityException({ code: 'COUPLE_ASSESSMENT_INVALID', message: 'Valid Idempotency-Key required.', details: {} });
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.context(tx, id, patient);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'couple-joint-command:'+patient.id+':'+key},0))`);
      const prior = await tx.coupleAssessmentJointResult.findUnique({ where: { generatedByPatientId_idempotencyKey: { generatedByPatientId: patient.id, idempotencyKey: key } }, select: { sessionId: true } }); if (prior && prior.sessionId !== id.toLowerCase()) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Command key is already used.', details: {} });
      const paid = await this.participation.paidMutualReady(tx, id, true); if (!paid) throw notReady();
      const existing = await tx.coupleAssessmentJointResult.findUnique({ where: { sessionId: id } }); if (existing) { await this.auditBoth(tx, paid.context, existing.id, ctx, 'READ'); return this.view(tx, existing, paid.context.clinicId); }
      const metadata = await this.metadata(tx, paid.purchase.id); if (metadata.length !== 2 || metadata.some(m => m.state !== 'COMPLETE' || !m.completedAt)) throw notReady();
      const source = await tx.assessmentVersion.findUniqueOrThrow({ where: { id: paid.context.assessmentVersionId }, select: { structure: true, contentHash: true } });
      const initiator = metadata.find(m => m.slot === 'INITIATOR'), partner = metadata.find(m => m.slot === 'PARTNER'); if (!initiator || !partner) throw notReady();
      const a = assessmentResultProvenance(source, initiator.snapshot, initiator.completionPayloadHash), b = assessmentResultProvenance(source, partner.snapshot, partner.completionPayloadHash); if (a.status !== 'SUPPORTED' || b.status !== 'SUPPORTED') throw notReady();
      const protocol = await tx.coupleResultProtocolVersion.findUniqueOrThrow({ where: { id: paid.context.jointProtocolId } });
      const pair = selectCouplePair(protocol.pairs as unknown as CoupleResultPair[], a.bandId, b.bandId); if (!pair) throw notReady();
      const refs = protocol.contentReferences as Reference[]; const selected = pair.guidanceContentIds.map(id => refs.find(r => r.id === id)!); if (selected.some(r => !r)) throw notReady();
      const snapshot: JointSnapshot = { snapshotVersion: 1, ...COUPLE_RESULT_ALGORITHM, contextHash: paid.context.contextHash, jointProtocolHash: protocol.contentHash, contentReferences: selected, recommendConsultation: pair.recommendConsultation };
      const [time] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${initiator.completedAt}::timestamptz,${partner.completedAt}::timestamptz,${paid.purchase.createdAt}::timestamptz) AS now`);
      const row = await tx.coupleAssessmentJointResult.create({ data: { clinicId: patient.clinicId, sessionId: id, purchaseId: paid.purchase.id, jointProtocolId: protocol.id, contextHash: paid.context.contextHash, protocolHash: protocol.contentHash, ...COUPLE_RESULT_ALGORITHM, initiatorSubmissionId: initiator.id, partnerSubmissionId: partner.id, initiatorCompletionHash: initiator.completionPayloadHash!, partnerCompletionHash: partner.completionPayloadHash!, resultSnapshot: snapshot, contentHash: coupleProtocolHash(snapshot), generatedByPatientId: patient.id, generatedSessionId: ctx.actorSessionId, idempotencyKey: key, createdAt: time!.now } });
      await this.auditBoth(tx, paid.context, row.id, ctx, 'CREATE'); return this.view(tx, row, patient.clinicId);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async get(id: string, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.context(tx, id, patient); const paid = await this.participation.paidMutualReady(tx, id); if (!paid) throw missing();
      const row = await tx.coupleAssessmentJointResult.findUnique({ where: { sessionId: id } }); if (!row) throw missing(); await this.auditBoth(tx, paid.context, row.id, ctx, 'READ'); return this.view(tx, row, patient.clinicId);
    }, { isolationLevel: 'RepeatableRead' });
  }
  private metadata(tx: Tx, purchaseId: string) {
    // Individual responses and scores are excluded in SQL before joint processing.
    return tx.$queryRaw<Metadata[]>(Prisma.sql`SELECT s.id,g.slot,s.state,s.completion_payload_hash AS "completionPayloadHash",s.completed_at AS "completedAt",jsonb_build_object('algorithmId',s.result_snapshot->'algorithmId','algorithmVersion',s.result_snapshot->'algorithmVersion','questionnaireContentHash',s.result_snapshot->'questionnaireContentHash','answerPayloadHash',s.result_snapshot->'answerPayloadHash','resultBand',s.result_snapshot->'resultBand') AS snapshot FROM assessment_access_grants g JOIN patient_assessment_submissions s ON s.access_grant_id=g.id WHERE g.purchase_id=${purchaseId}::uuid AND s.invalidated_at IS NULL ORDER BY g.slot`);
  }
  private async view(tx: Tx, row: CoupleAssessmentJointResult, clinicId: string) {
    const snapshot = row.resultSnapshot as unknown as JointSnapshot;
    if (row.clinicId !== clinicId || coupleProtocolHash(snapshot) !== row.contentHash || snapshot.contextHash !== row.contextHash || snapshot.jointProtocolHash !== row.protocolHash || snapshot.algorithmId !== COUPLE_RESULT_ALGORITHM.algorithmId || snapshot.algorithmVersion !== COUPLE_RESULT_ALGORITHM.algorithmVersion) throw missing();
    const versions = await this.content.approvedVersions(tx, clinicId, snapshot.contentReferences.map(r => r.id)); if (versions.length !== snapshot.contentReferences.length || versions.some((v, index) => v.contentHash !== snapshot.contentReferences[index]!.contentHash)) throw missing();
    return { id: row.id, coupleAssessmentId: row.sessionId, jointProtocolId: row.jointProtocolId, algorithmId: row.algorithmId, algorithmVersion: row.algorithmVersion, contentHash: row.contentHash, createdAt: row.createdAt, educationalOnly: true as const, content: versions.map(v => this.content.project(v)), recommendConsultation: snapshot.recommendConsultation };
  }
  private async auditBoth(tx: Tx, context: { id: string; clinicId: string; participants: { patientId: string }[] }, resultId: string, actor: Context, action: 'READ' | 'CREATE') { for (const p of context.participants) await this.clinicalAudit.record({ clinicId: context.clinicId, patientId: p.patientId, action, resourceType: 'COUPLE_JOINT_EDUCATION', resourceId: resultId, resourceRevisionId: context.id, metadata: {} }, actor, tx); }
  private async patient(tx: Tx, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx); const patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId }, select: { id: true, clinicId: true } }); if (patient.clinicId !== clinicId) throw missing(); await this.access.self(tx, patient, ctx); return patient; }
  private async context(tx: Tx, id: string, patient: { id: string; clinicId: string }) { if (!await tx.coupleAssessmentSession.count({ where: { id, clinicId: patient.clinicId, participants: { some: { patientId: patient.id } } } })) throw new NotFoundException({ code: 'COUPLE_ASSESSMENT_NOT_FOUND', message: 'Owned coupled context unavailable.', details: {} }); }
}

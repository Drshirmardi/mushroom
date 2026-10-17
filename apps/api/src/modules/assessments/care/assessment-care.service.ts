import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type AssessmentCareShare } from '../../../generated/prisma/client';
import { GuidanceAuthorityService, type GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { ClinicalAccessAuditService } from '../../clinical/clinical-access-audit.service';
import { AssessmentAccessService } from '../access/assessment-access.service';
import { AssessmentProtocolService } from '../protocol/assessment-protocol.service';
import { assessmentResultProvenance } from '../domain/assessment-result-provenance';
import { canonicalAssessmentJson } from '../domain/assessment-canonical-json';
import type { AssessmentCareAcceptDto, AssessmentCarePageQueryDto, AssessmentCareShareDto, AssessmentCareSummaryDto } from './assessment-care.dto';
type Tx = Prisma.TransactionClient;
type Patient = { id: string; clinicId: string };
type Metadata = { id: string; assessmentVersionId: string; completionPayloadHash: string; completedAt: Date; structure: Prisma.JsonValue; contentHash: string; title: string; locale: string; versionNumber: number; accessGrantId: string | null; boundProcessingConsentId: string | null; snapshot: Prisma.JsonValue };
const missing = () => new NotFoundException({ code: 'ASSESSMENT_CARE_NOT_FOUND', message: 'Owned or authorized assessment care resource unavailable.', details: {} });
const conflict = () => new ConflictException({ code: 'ASSESSMENT_CARE_CONFLICT', message: 'The exact care source, assignment or consent changed.', details: {} });
const hash = (value: unknown) => createHash('sha256').update(canonicalAssessmentJson(value)).digest('hex');
const key = (value?: string) => { const text = value?.trim(); if (!text || !/^[\x21-\x7e]{8,200}$/u.test(text)) throw conflict(); return text; };

@Injectable()
export class AssessmentCareService {
  constructor(private readonly prisma: PrismaService, private readonly authority: GuidanceAuthorityService, private readonly access: AssessmentAccessService, private readonly protocols: AssessmentProtocolService, private readonly audit: ClinicalAccessAuditService) {}

  async preview(appointmentId: string, submissionId: string, ctx: Context) {
    return this.prisma.$transaction(async tx => { const patient = await this.patient(tx, ctx), candidate = await this.candidate(tx, patient, appointmentId, submissionId); await this.record(tx, patient, 'READ', 'ASSESSMENT_CARE_PREVIEW', appointmentId, ctx); return { appointmentId, assignedDoctorId: candidate.appointment.doctorId, contextHash: candidate.contextHash, source: this.summary(candidate.source), processingPolicy: this.policy(candidate.processingPolicy), carePolicy: this.policy(candidate.carePolicy) }; }, { isolationLevel: 'RepeatableRead' });
  }
  async accept(appointmentId: string, body: AssessmentCareAcceptDto, rawKey: string | undefined, ctx: Context) {
    const commandKey = key(rawKey), payloadHash = hash({ appointmentId, ...body, submissionId: body.submissionId.toLowerCase(), processingConsentRecordId: body.processingConsentRecordId.toLowerCase(), carePolicyVersionId: body.carePolicyVersionId.toLowerCase() });
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.ownedAppointment(tx, appointmentId, patient);
      await this.lock(tx, `assessment-care-command:${patient.id}:${commandKey}`);
      const prior = await tx.assessmentCareShare.findUnique({ where: { patientId_idempotencyKey: { patientId: patient.id, idempotencyKey: commandKey } } });
      if (prior) { if (prior.payloadHash !== payloadHash || prior.appointmentId !== appointmentId) throw conflict(); await this.record(tx, patient, 'READ', 'ASSESSMENT_CARE_CONSENT', prior.id, ctx); return this.project(tx, prior); }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM appointments WHERE id=${appointmentId}::uuid FOR UPDATE`);
      const candidate = await this.candidate(tx, patient, appointmentId, body.submissionId, true);
      if (body.careSharingAccepted !== true || body.contextHash !== candidate.contextHash || body.carePolicyVersionId.toLowerCase() !== candidate.carePolicy.id || body.carePolicyContentHash !== candidate.carePolicy.contentHash) throw conflict();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM patient_consent_records WHERE id=${body.processingConsentRecordId}::uuid AND patient_id=${patient.id}::uuid FOR SHARE`);
      const medical = await tx.patientConsentRecord.findFirst({ where: { id: body.processingConsentRecordId, patientId: patient.id, policyVersionId: candidate.processingPolicy.id, contentHash: candidate.processingPolicy.contentHash, withdrawnAt: null } });
      if (!medical || (candidate.source.boundProcessingConsentId && candidate.source.boundProcessingConsentId !== medical.id)) throw conflict();
      const existing = await tx.assessmentCareShare.count({ where: { appointmentId, submissionId: candidate.source.id, withdrawnAt: null } }); if (existing) throw conflict();
      const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${candidate.source.completedAt}::timestamptz,${medical.acceptedAt}::timestamptz) AS now`);
      const row = await tx.assessmentCareShare.create({ data: { clinicId: patient.clinicId, patientId: patient.id, appointmentId, doctorId: candidate.appointment.doctorId, submissionId: candidate.source.id, protocolReviewId: candidate.review.id, protocolHash: candidate.review.protocolHash, sourceHash: candidate.source.completionPayloadHash, processingConsentRecordId: medical.id, carePolicyVersionId: candidate.carePolicy.id, carePolicyContentHash: candidate.carePolicy.contentHash, contextHash: candidate.contextHash, payloadHash, acceptedByUserId: ctx.actorUserId, acceptedSessionId: ctx.actorSessionId, acceptedAt: clock!.now, idempotencyKey: commandKey } });
      await this.record(tx, patient, 'CREATE', 'ASSESSMENT_CARE_CONSENT', row.id, ctx); return this.project(tx, row);
    }, { maxWait: 30_000, timeout: 15_000 });
  }
  async withdraw(appointmentId: string, shareId: string, rawKey: string | undefined, ctx: Context) {
    const commandKey = key(rawKey);
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.ownedAppointment(tx, appointmentId, patient); await this.lock(tx, `assessment-care-withdrawal:${patient.id}:${commandKey}`);
      const previous = await tx.assessmentCareShare.findUnique({ where: { patientId_withdrawalIdempotencyKey: { patientId: patient.id, withdrawalIdempotencyKey: commandKey } } }); if (previous && previous.id !== shareId) throw conflict();
      const [owned] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_care_shares WHERE id=${shareId}::uuid AND appointment_id=${appointmentId}::uuid AND patient_id=${patient.id}::uuid AND clinic_id=${patient.clinicId}::uuid FOR UPDATE`); if (!owned) throw missing();
      let row = await tx.assessmentCareShare.findUniqueOrThrow({ where: { id: shareId } });
      const action = row.withdrawnAt ? 'READ' : 'UPDATE';
      if (!row.withdrawnAt) { const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT GREATEST(CURRENT_TIMESTAMP,${row.acceptedAt}::timestamptz) AS now`); row = await tx.assessmentCareShare.update({ where: { id: row.id }, data: { withdrawnAt: clock!.now, withdrawnByUserId: ctx.actorUserId, withdrawnSessionId: ctx.actorSessionId, withdrawalIdempotencyKey: commandKey } }); }
      await this.record(tx, patient, action, 'ASSESSMENT_CARE_CONSENT', row.id, ctx); return this.project(tx, row);
    });
  }
  async list(appointmentId: string, query: AssessmentCarePageQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const patient = await this.patient(tx, ctx); await this.ownedAppointment(tx, appointmentId, patient);
      const [rows, total] = await Promise.all([tx.assessmentCareShare.findMany({ where: { appointmentId, patientId: patient.id, clinicId: patient.clinicId }, orderBy: [{ acceptedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), tx.assessmentCareShare.count({ where: { appointmentId, patientId: patient.id, clinicId: patient.clinicId } })]);
      const allowed = rows.length ? await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM assessment_care_shares WHERE id IN (${Prisma.join(rows.map(r => Prisma.sql`${r.id}::uuid`))}) AND assessment_care_share_current(id,false)`) : []; const available = new Set(allowed.map(r => r.id));
      await this.record(tx, patient, 'READ', 'ASSESSMENT_CARE_HISTORY', appointmentId, ctx); return { items: rows.map(r => this.view(r, available.has(r.id))), total, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async clinician(appointmentId: string, query: AssessmentCarePageQueryDto, ctx: Context) {
    return this.prisma.$transaction(async tx => {
      const clinicId = await this.authority.scope(tx, 'doctor', ctx), doctorId = await this.authority.doctor(tx, clinicId, ctx.actorUserId);
      const appointment = await tx.appointment.findFirst({ where: { id: appointmentId, clinicId, doctorId }, select: { id: true, patientId: true } }); if (!appointment) throw missing();
      const [open] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_care_appointment_current(${appointmentId}::uuid,true) AS allowed`); if (!open?.allowed) throw missing();
      const [refs, count] = await Promise.all([tx.$queryRaw<{ id: string; submissionId: string }[]>(Prisma.sql`SELECT id,submission_id AS "submissionId" FROM assessment_care_shares WHERE appointment_id=${appointmentId}::uuid AND patient_id=${appointment.patientId}::uuid AND doctor_id=${doctorId}::uuid AND clinic_id=${clinicId}::uuid AND withdrawn_at IS NULL AND assessment_care_share_current(id,true) ORDER BY accepted_at DESC,id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`), tx.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT count(*)::int AS n FROM assessment_care_shares WHERE appointment_id=${appointmentId}::uuid AND patient_id=${appointment.patientId}::uuid AND doctor_id=${doctorId}::uuid AND clinic_id=${clinicId}::uuid AND withdrawn_at IS NULL AND assessment_care_share_current(id,true)`)]);
      const sources = await this.metadata(tx, refs.map(r => r.submissionId), appointment.patientId, clinicId);
      const items = refs.map(ref => { const source = sources.find(s => s.id === ref.submissionId); if (!source) throw missing(); return { shareId: ref.id, ...this.summary(source) }; });
      await this.record(tx, { id: appointment.patientId, clinicId }, 'READ', 'ASSIGNED_ASSESSMENT_CONTEXT', appointmentId, ctx); return { appointmentId, patientId: appointment.patientId, items, total: count[0]!.n, page: query.page, pageSize: query.pageSize };
    }, { isolationLevel: 'RepeatableRead' });
  }
  private async candidate(tx: Tx, patient: Patient, appointmentId: string, submissionId: string, lock = false) {
    const appointment = await this.ownedAppointment(tx, appointmentId, patient);
    const [open] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_care_appointment_current(${appointmentId}::uuid,false) AS allowed`); if (!open?.allowed) throw missing();
    const [source] = await this.metadata(tx, [submissionId], patient.id, patient.clinicId); if (!source) throw missing(); this.summary(source);
    if (lock) { await this.lock(tx, `assessment-protocol:${source.assessmentVersionId}`); await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${source.assessmentVersionId}::uuid FOR SHARE`); }
    const review = await this.protocols.usableApproval(tx, patient.clinicId, source.assessmentVersionId); if (!review) throw missing();
    if (lock) { await this.protocols.lockApprovalAuthority(tx, review); await this.authority.doctor(tx, patient.clinicId, (await tx.doctorProfile.findUniqueOrThrow({ where: { id: appointment.doctorId }, select: { userId: true } })).userId!, true); }
    const carePolicy = await tx.consentPolicyVersion.findFirst({ where: { clinicId: patient.clinicId, locale: source.locale, policyKey: 'ASSESSMENT_CARE_SHARING', status: 'ACTIVE' } });
    const processingPolicy = await tx.consentPolicyVersion.findUniqueOrThrow({ where: { id: review.consentPolicyVersionId } }); if (!carePolicy?.activatedAt || createHash('sha256').update(carePolicy.body).digest('hex') !== carePolicy.contentHash) throw missing();
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM consent_policy_versions WHERE id IN (${carePolicy.id}::uuid,${processingPolicy.id}::uuid) ORDER BY id FOR SHARE`);
    if (lock) { const [current] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_care_appointment_current(${appointmentId}::uuid,false) AND assessment_care_source_current(${source.id}::uuid,${review.id}::uuid) AND EXISTS(SELECT 1 FROM consent_policy_versions WHERE id=${carePolicy.id}::uuid AND status='ACTIVE' AND content_hash=${carePolicy.contentHash}) AS allowed`); if (!current?.allowed) throw conflict(); }
    const contextHash = hash({ version: 1, clinicId: patient.clinicId, patientId: patient.id, appointmentId, doctorId: appointment.doctorId, submissionId: source.id, sourceHash: source.completionPayloadHash, protocolReviewId: review.id, protocolHash: review.protocolHash, processingPolicyId: processingPolicy.id, processingPolicyHash: processingPolicy.contentHash, carePolicyVersionId: carePolicy.id, carePolicyContentHash: carePolicy.contentHash });
    return { appointment, source, review, carePolicy, processingPolicy, contextHash };
  }
  private metadata(tx: Tx, ids: string[], patientId: string, clinicId: string) {
    if (!ids.length) return Promise.resolve([] as Metadata[]);
    return tx.$queryRaw<Metadata[]>(Prisma.sql`SELECT s.id,s.assessment_version_id AS "assessmentVersionId",s.completion_payload_hash AS "completionPayloadHash",s.completed_at AS "completedAt",s.access_grant_id AS "accessGrantId",own.processing_consent_record_id AS "boundProcessingConsentId",v.structure,v.content_hash AS "contentHash",v.title,v.locale,v.version_number AS "versionNumber",jsonb_build_object('algorithmId',s.result_snapshot->'algorithmId','algorithmVersion',s.result_snapshot->'algorithmVersion','questionnaireContentHash',s.result_snapshot->'questionnaireContentHash','answerPayloadHash',s.result_snapshot->'answerPayloadHash','resultBand',s.result_snapshot->'resultBand') AS snapshot FROM patient_assessment_submissions s JOIN assessment_versions v ON v.id=s.assessment_version_id LEFT JOIN assessment_access_grants own ON own.id=s.access_grant_id WHERE s.id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) AND s.patient_id=${patientId}::uuid AND v.clinic_id=${clinicId}::uuid AND s.state='COMPLETE' AND s.completed_at IS NOT NULL AND s.invalidated_at IS NULL AND assessment_submission_access_allowed(s.id,${patientId}::uuid)`);
  }
  private summary(source: Metadata): AssessmentCareSummaryDto {
    const provenance = assessmentResultProvenance(source, source.snapshot, source.completionPayloadHash); if (provenance.status !== 'SUPPORTED') throw missing();
    return { submissionId: source.id, assessmentVersionId: source.assessmentVersionId, title: source.title, versionNumber: source.versionNumber, completedAt: source.completedAt, algorithmId: 'WEIGHTED_SUM', algorithmVersion: 1, questionnaireContentHash: source.contentHash, resultBand: { id: provenance.bandId, title: String(provenance.band.title), riskLevel: String(provenance.band.riskLevel ?? 'NONE'), requiresReview: false }, educationalOnly: true, clinicalFact: false };
  }
  private policy(row: { id: string; versionNumber: number; policyKey: string; locale: string; title: string; body: string; contentHash: string; status: string }) { return { id: row.id, versionNumber: row.versionNumber, policyKey: row.policyKey, locale: row.locale, title: row.title, body: row.body, contentHash: row.contentHash, status: row.status }; }
  private async project(tx: Tx, row: AssessmentCareShare) { const [current] = await tx.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT assessment_care_share_current(${row.id}::uuid,false) AS allowed`); return this.view(row, !!current?.allowed); }
  private view(row: AssessmentCareShare, currentlyAvailable: boolean): AssessmentCareShareDto { return { id: row.id, appointmentId: row.appointmentId, assignedDoctorId: row.doctorId, submissionId: row.submissionId, contextHash: row.contextHash, acceptedAt: row.acceptedAt, withdrawnAt: row.withdrawnAt, currentlyAvailable }; }
  private async patient(tx: Tx, ctx: Context) { const clinicId = await this.authority.scope(tx, 'patient', ctx); const patient = await tx.patientProfile.findUniqueOrThrow({ where: { userId: ctx.actorUserId }, select: { id: true, clinicId: true } }); if (patient.clinicId !== clinicId) throw missing(); await this.access.self(tx, patient, ctx); return patient; }
  private async ownedAppointment(tx: Tx, id: string, patient: Patient) { const row = await tx.appointment.findFirst({ where: { id, patientId: patient.id, clinicId: patient.clinicId }, select: { id: true, doctorId: true } }); if (!row) throw missing(); return row; }
  private lock(tx: Tx, resource: string) { return tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${resource},0))`); }
  private record(tx: Tx, patient: Patient, action: 'READ' | 'CREATE' | 'UPDATE', resourceType: string, resourceId: string, ctx: Context) { return this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action, resourceType, resourceId, metadata: {} }, ctx, tx); }
}

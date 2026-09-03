import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { ClinicalRecordRevisionState, ClinicalRecordState, PatientAccessAction, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';

export const CLINICAL_RECORD_KINDS = ['DIAGNOSIS', 'ALLERGY', 'CONDITION', 'MEDICATION_STATEMENT'] as const;
export type ClinicalRecordKind = (typeof CLINICAL_RECORD_KINDS)[number];

export type ReconcileClinicalRecordInput = {
  kind: ClinicalRecordKind;
  patientId: string;
  encounterId?: string;
  sourceIntakeId: string;
  sourceIntakeRevisionId: string;
  sourceIntakeRevisionNumber: number;
  reviewedContent: Record<string, unknown>;
};

export type ReviseClinicalRecordInput = { expectedRevision: number; reviewedContent: Record<string, unknown>; amendmentReasonCategory?: string | null };

const forbidden = () => new ConflictException({ code: 'CLINICAL_RECONCILIATION_FORBIDDEN', message: 'The clinical reconciliation resource is not available to this clinic.', details: {} });
const sourceInvalid = () => new UnprocessableEntityException({ code: 'CLINICAL_RECONCILIATION_SOURCE_INVALID', message: 'A matching immutable self-reported intake revision is required.', details: {} });
const contentInvalid = () => new UnprocessableEntityException({ code: 'CLINICAL_RECONCILIATION_CONTENT_INVALID', message: 'Reviewed clinical content must be a non-empty object.', details: {} });
const revisionConflict = (currentRevision: number) => new ConflictException({ code: 'CLINICAL_RECORD_REVISION_CONFLICT', message: 'The clinical record revision is no longer current.', details: { currentRevision } });
const amendmentRequired = () => new UnprocessableEntityException({ code: 'CLINICAL_RECORD_AMENDMENT_REASON_REQUIRED', message: 'An amendment reason category is required when revising signed content.', details: {} });
const signingNotAllowed = () => new ConflictException({ code: 'CLINICAL_RECORD_SIGNING_NOT_ALLOWED', message: 'Only the current draft clinical record revision may be signed.', details: {} });

@Injectable()
export class ClinicalReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: ClinicalAccessAuditService,
  ) {}

  async reconcile(input: ReconcileClinicalRecordInput, actorUserId: string, auditContext?: ClinicalAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const clinic = await this.clinic(tx);
      const patient = await tx.patientProfile.findFirst({ where: { id: input.patientId, clinicId: clinic.id }, select: { id: true } });
      if (!patient) throw forbidden();
      if (input.encounterId) {
        const encounter = await tx.encounter.findFirst({ where: { id: input.encounterId, clinicId: clinic.id, patientId: patient.id }, select: { id: true } });
        if (!encounter) throw forbidden();
      }
      await this.source(tx, clinic.id, patient.id, input);
      const reviewedContent = this.content(input.reviewedContent);
      const rootData = { clinicId: clinic.id, patientId: patient.id, encounterId: input.encounterId, sourceIntakeId: input.sourceIntakeId, sourceIntakeRevisionId: input.sourceIntakeRevisionId, sourceIntakeRevisionNumber: input.sourceIntakeRevisionNumber, state: ClinicalRecordState.ACTIVE, currentRevisionNumber: 1 };

      const root = await this.root(tx, input.kind, rootData);
      const revision = await tx.clinicalRecordRevision.create({ data: { ...this.parent(input.kind, root.id), revisionNumber: 1, content: reviewedContent as Prisma.InputJsonValue, isPrivate: true, authoredByUserId: actorUserId } });
      if (auditContext) await this.audit.record({ clinicId: clinic.id, patientId: patient.id, action: PatientAccessAction.CREATE, resourceType: this.resourceType(input.kind), resourceId: root.id, resourceRevisionId: revision.id, metadata: { revisionNumber: 1, source: 'REVIEWED_INTAKE' } }, auditContext, tx);
      return { id: root.id, kind: input.kind, patientId: patient.id, encounterId: input.encounterId ?? null, state: ClinicalRecordState.ACTIVE, currentRevision: 1, source: { intakeId: input.sourceIntakeId, intakeRevisionId: input.sourceIntakeRevisionId, intakeRevisionNumber: input.sourceIntakeRevisionNumber, provenance: 'PATIENT_SELF_REPORTED' }, revision: { id: revision.id, revisionNumber: revision.revisionNumber, state: revision.state, content: revision.content, isPrivate: revision.isPrivate, authoredByUserId: revision.authoredByUserId, authoredAt: revision.authoredAt } };
    });
  }

  async revise(kind: ClinicalRecordKind, recordId: string, input: ReviseClinicalRecordInput, actorUserId: string, auditContext?: ClinicalAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, kind, recordId);
      const root = await this.existing(tx, kind, recordId);
      if (root.currentRevisionNumber !== input.expectedRevision) throw revisionConflict(root.currentRevisionNumber);
      const previous = await tx.clinicalRecordRevision.findFirst({ where: this.parent(kind, root.id), orderBy: { revisionNumber: 'desc' } });
      if (!previous) throw revisionConflict(0);
      const amendmentReasonCategory = this.reason(input.amendmentReasonCategory);
      if (previous.state === ClinicalRecordRevisionState.SIGNED && !amendmentReasonCategory) throw amendmentRequired();
      const revisionNumber = root.currentRevisionNumber + 1;
      const revision = await tx.clinicalRecordRevision.create({ data: { ...this.parent(kind, root.id), revisionNumber, previousRevisionId: previous.id, content: this.content(input.reviewedContent) as Prisma.InputJsonValue, isPrivate: true, amendmentReasonCategory, authoredByUserId: actorUserId } });
      await this.updateRoot(tx, kind, root.id, revisionNumber);
      if (auditContext) await this.audit.record({ clinicId: root.clinicId, patientId: root.patientId, action: PatientAccessAction.UPDATE, resourceType: this.resourceType(kind), resourceId: root.id, resourceRevisionId: revision.id, metadata: { revisionNumber, amendmentReasonCategory: amendmentReasonCategory ?? null } }, auditContext, tx);
      return this.revisionResponse(kind, root.id, revision, revisionNumber, root.latestSignedRevisionNumber);
    });
  }

  async sign(kind: ClinicalRecordKind, recordId: string, revisionNumber: number, expectedRevision: number, actorUserId: string, auditContext?: ClinicalAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, kind, recordId);
      const root = await this.existing(tx, kind, recordId);
      if (root.currentRevisionNumber !== expectedRevision) throw revisionConflict(root.currentRevisionNumber);
      if (revisionNumber !== root.currentRevisionNumber) throw signingNotAllowed();
      const revision = await tx.clinicalRecordRevision.findFirst({ where: { ...this.parent(kind, root.id), revisionNumber } });
      if (!revision) throw signingNotAllowed();
      if (revision.state === ClinicalRecordRevisionState.SIGNED) return this.revisionResponse(kind, root.id, revision, root.currentRevisionNumber, root.latestSignedRevisionNumber);
      if (revision.state !== ClinicalRecordRevisionState.DRAFT) throw signingNotAllowed();
      const signed = await tx.clinicalRecordRevision.update({ where: { id: revision.id }, data: { state: ClinicalRecordRevisionState.SIGNED, signedAt: new Date(), signedByUserId: actorUserId, integrityHash: this.hash(kind, root.id, revision) } });
      await this.updateRoot(tx, kind, root.id, root.currentRevisionNumber, signed.revisionNumber);
      if (auditContext) await this.audit.record({ clinicId: root.clinicId, patientId: root.patientId, action: PatientAccessAction.SIGN, resourceType: this.resourceType(kind), resourceId: root.id, resourceRevisionId: signed.id, metadata: { revisionNumber: signed.revisionNumber } }, auditContext, tx);
      return this.revisionResponse(kind, root.id, signed, root.currentRevisionNumber, signed.revisionNumber);
    });
  }

  private async root(tx: Prisma.TransactionClient, kind: ClinicalRecordKind, data: { clinicId: string; patientId: string; encounterId?: string; sourceIntakeId: string; sourceIntakeRevisionId: string; sourceIntakeRevisionNumber: number; state: ClinicalRecordState; currentRevisionNumber: number }) {
    switch (kind) {
      case 'DIAGNOSIS': return tx.diagnosis.create({ data });
      case 'ALLERGY': return tx.allergyRecord.create({ data });
      case 'CONDITION': return tx.conditionRecord.create({ data });
      case 'MEDICATION_STATEMENT': return tx.medicationStatement.create({ data });
    }
  }

  private parent(kind: ClinicalRecordKind, id: string) {
    switch (kind) {
      case 'DIAGNOSIS': return { diagnosisId: id };
      case 'ALLERGY': return { allergyRecordId: id };
      case 'CONDITION': return { conditionRecordId: id };
      case 'MEDICATION_STATEMENT': return { medicationStatementId: id };
    }
  }

  private resourceType(kind: ClinicalRecordKind) {
    return `CLINICAL_${kind}`;
  }

  private async existing(tx: Prisma.TransactionClient, kind: ClinicalRecordKind, id: string) {
    const clinic = await this.clinic(tx);
    const select = { id: true, clinicId: true, patientId: true, currentRevisionNumber: true, latestSignedRevisionNumber: true };
    const where = { id, clinicId: clinic.id, state: ClinicalRecordState.ACTIVE };
    const root = kind === 'DIAGNOSIS' ? await tx.diagnosis.findFirst({ where, select }) : kind === 'ALLERGY' ? await tx.allergyRecord.findFirst({ where, select }) : kind === 'CONDITION' ? await tx.conditionRecord.findFirst({ where, select }) : await tx.medicationStatement.findFirst({ where, select });
    if (!root) throw forbidden();
    return root;
  }

  private async updateRoot(tx: Prisma.TransactionClient, kind: ClinicalRecordKind, id: string, currentRevisionNumber: number, latestSignedRevisionNumber?: number) {
    const data = { currentRevisionNumber, ...(latestSignedRevisionNumber === undefined ? {} : { latestSignedRevisionNumber }) };
    if (kind === 'DIAGNOSIS') return tx.diagnosis.update({ where: { id }, data });
    if (kind === 'ALLERGY') return tx.allergyRecord.update({ where: { id }, data });
    if (kind === 'CONDITION') return tx.conditionRecord.update({ where: { id }, data });
    return tx.medicationStatement.update({ where: { id }, data });
  }

  private async lock(tx: Prisma.TransactionClient, kind: ClinicalRecordKind, id: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`clinical-record:${kind}:${id}`}, 0))::text AS locked`;
  }

  private async source(tx: Prisma.TransactionClient, clinicId: string, patientId: string, input: ReconcileClinicalRecordInput) {
    const source = await tx.patientMedicalIntakeRevision.findFirst({ where: { id: input.sourceIntakeRevisionId, revisionNumber: input.sourceIntakeRevisionNumber, intake: { id: input.sourceIntakeId, clinicId, patientId } }, select: { id: true } });
    if (!source) throw sourceInvalid();
  }

  private content(value: Record<string, unknown>) {
    if (!value || Array.isArray(value) || Object.keys(value).length === 0) throw contentInvalid();
    return value;
  }

  private reason(value: string | null | undefined) { const reason = value?.trim() ?? null; return reason || null; }

  private hash(kind: ClinicalRecordKind, recordId: string, revision: { revisionNumber: number; previousRevisionId: string | null; content: Prisma.JsonValue; isPrivate: boolean; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null }) {
    return createHash('sha256').update(JSON.stringify({ kind, recordId, revisionNumber: revision.revisionNumber, previousRevisionId: revision.previousRevisionId, content: revision.content, isPrivate: revision.isPrivate, amendmentReasonCategory: revision.amendmentReasonCategory, authoredAt: revision.authoredAt.toISOString(), authoredByUserId: revision.authoredByUserId })).digest('hex');
  }

  private revisionResponse(kind: ClinicalRecordKind, id: string, revision: { id: string; revisionNumber: number; previousRevisionId: string | null; state: ClinicalRecordRevisionState; content: Prisma.JsonValue; isPrivate: boolean; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null; signedAt: Date | null; signedByUserId: string | null; integrityHash: string | null }, currentRevision: number, latestSignedRevision: number | null) {
    return { id, kind, currentRevision, latestSignedRevision, revision: { ...revision } };
  }

  private async clinic(tx: Prisma.TransactionClient) {
    const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } });
    if (!clinic) throw forbidden();
    return clinic;
  }
}

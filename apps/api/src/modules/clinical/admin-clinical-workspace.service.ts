import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';

import { ClinicalRecordRevisionState, ClinicalNoteRevisionState, PatientAccessAction, Prisma } from '../../generated/prisma/client';
import { ClinicalPermissionService, type ClinicalPermission } from '../../common/auth/clinical-permission.service';
import type { RoleCode } from '../../common/auth/authorization.policy';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { CreateClinicalNoteDto, PublishClinicalNoteDto, ReconcileClinicalRecordDto, ReviseClinicalRecordDto, SaveClinicalNoteDto, SignClinicalRevisionDto } from './admin-clinical-workspace.dto';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalReconciliationService, type ClinicalRecordKind } from './clinical-reconciliation.service';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';

type ClinicalActor = ClinicalAuditContext & { roles: RoleCode[] };

const forbidden = () => new ForbiddenException({ code: 'CLINICAL_RESOURCE_FORBIDDEN', message: 'The clinical resource is not available to this actor.', details: {} });
const publicationNotAllowed = () => new UnprocessableEntityException({ code: 'CLINICAL_NOTE_PUBLICATION_NOT_ALLOWED', message: 'Only the current signed revision with a patient summary may be published.', details: {} });

@Injectable()
export class AdminClinicalWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ClinicalResourceAccessService,
    private readonly permissions: ClinicalPermissionService,
    private readonly audit: ClinicalAccessAuditService,
    private readonly notes: ClinicalNotesService,
    private readonly reconciliation: ClinicalReconciliationService,
  ) {}

  async get(patientId: string, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    return this.prisma.$transaction(async (tx) => {
      const [encounters, notes, diagnoses, allergies, conditions, medications, intake] = await Promise.all([
        tx.encounter.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId }, orderBy: { startedAt: 'desc' }, select: { id: true, appointmentId: true, state: true, startedAt: true, completedAt: true } }),
        tx.clinicalNote.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId }, orderBy: { updatedAt: 'desc' }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } }),
        tx.diagnosis.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId }, orderBy: { updatedAt: 'desc' } }),
        tx.allergyRecord.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId }, orderBy: { updatedAt: 'desc' } }),
        tx.conditionRecord.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId }, orderBy: { updatedAt: 'desc' } }),
        tx.medicationStatement.findMany({ where: { patientId: patient.id, clinicId: patient.clinicId }, orderBy: { updatedAt: 'desc' } }),
        tx.patientMedicalIntake.findFirst({ where: { patientId: patient.id, clinicId: patient.clinicId }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } }),
      ]);
      const roots = [...diagnoses.map((item) => ({ kind: 'DIAGNOSIS' as const, item })), ...allergies.map((item) => ({ kind: 'ALLERGY' as const, item })), ...conditions.map((item) => ({ kind: 'CONDITION' as const, item })), ...medications.map((item) => ({ kind: 'MEDICATION_STATEMENT' as const, item }))];
      const revisionIds = roots.map(({ kind, item }) => this.revisionFilter(kind, item.id, item.currentRevisionNumber));
      const revisions = revisionIds.length ? await tx.clinicalRecordRevision.findMany({ where: { OR: revisionIds } }) : [];
      const records = roots.map(({ kind, item }) => {
        const revision = revisions.find((candidate) => this.matchesRevision(kind, item.id, candidate));
        return { id: item.id, kind, encounterId: item.encounterId, state: item.state, currentRevision: item.currentRevisionNumber, latestSignedRevision: item.latestSignedRevisionNumber, revision: revision ? this.recordRevision(revision) : null };
      });
      const timeline = [
        ...encounters.map((encounter) => ({ id: `encounter:${encounter.id}`, type: `ENCOUNTER_${encounter.state}`, occurredAt: encounter.completedAt ?? encounter.startedAt, encounterId: encounter.id })),
        ...notes.flatMap((note) => note.revisions.map((revision) => ({ id: `note:${revision.id}`, type: `CLINICAL_NOTE_${revision.state}`, occurredAt: revision.signedAt ?? revision.authoredAt, encounterId: note.encounterId }))),
        ...records.filter((record) => record.revision).map((record) => ({ id: `record:${record.revision!.id}`, type: `${record.kind}_${record.revision!.state}`, occurredAt: record.revision!.signedAt ?? record.revision!.authoredAt, encounterId: record.encounterId })),
      ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'ADMIN_CLINICAL_WORKSPACE', resourceId: patient.id, metadata: { view: 'WORKSPACE' } }, actor, tx);
      return {
        patientId: patient.id,
        intakeSource: intake?.revisions[0] ? { intakeId: intake.id, revisionId: intake.revisions[0].id, revisionNumber: intake.revisions[0].revisionNumber } : null,
        encounters,
        notes: notes.map((note) => ({ id: note.id, encounterId: note.encounterId, currentRevision: note.currentRevisionNumber, currentEffectiveRevision: note.currentEffectiveRevisionNumber, latestSignedRevision: note.latestSignedRevisionNumber, currentPublishedRevision: note.currentPublishedRevisionNumber, revision: note.revisions[0] ? this.noteRevision(note.revisions[0]) : null })),
        records,
        timeline,
      };
    });
  }

  async createNote(patientId: string, encounterId: string, input: CreateClinicalNoteDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    const encounter = await this.prisma.encounter.findFirst({ where: { id: encounterId, patientId: patient.id, clinicId: patient.clinicId }, select: { id: true } });
    if (!encounter) throw forbidden();
    return this.notes.create(encounterId, input, actor.actorUserId, actor, patient.clinicId);
  }

  async saveNote(patientId: string, noteId: string, input: SaveClinicalNoteDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.note(patient.id, patient.clinicId, noteId);
    if (await this.noteIsSigned(noteId, patient.clinicId)) await this.require(actor, 'clinical:record:amend');
    return this.notes.save(noteId, input, actor.actorUserId, actor, patient.clinicId);
  }

  async signNote(patientId: string, noteId: string, input: SignClinicalRevisionDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.note(patient.id, patient.clinicId, noteId);
    return this.notes.sign(noteId, input.revisionNumber, input.expectedRevision, actor.actorUserId, actor, patient.clinicId);
  }

  async publishNote(patientId: string, noteId: string, input: PublishClinicalNoteDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.note(patient.id, patient.clinicId, noteId);
    return this.notes.publish(noteId, input.revisionNumber, input.expectedRevision, actor.actorUserId, actor, patient.clinicId);
  }

  async reconcile(patientId: string, input: ReconcileClinicalRecordDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    return this.reconciliation.reconcile({ ...input, patientId }, actor.actorUserId, actor, patient.clinicId);
  }

  async reviseRecord(patientId: string, kind: ClinicalRecordKind, recordId: string, input: ReviseClinicalRecordDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.record(kind, recordId, patient.id, patient.clinicId);
    if (await this.recordIsSigned(kind, recordId, patient.clinicId)) await this.require(actor, 'clinical:record:amend');
    return this.reconciliation.revise(kind, recordId, input, actor.actorUserId, actor, patient.clinicId);
  }

  async signRecord(patientId: string, kind: ClinicalRecordKind, recordId: string, input: SignClinicalRevisionDto, actor: ClinicalActor) {
    const patient = await this.access.patient(actor.actorUserId, patientId);
    await this.record(kind, recordId, patient.id, patient.clinicId);
    return this.reconciliation.sign(kind, recordId, input.revisionNumber, input.expectedRevision, actor.actorUserId, actor, patient.clinicId);
  }

  private async require(actor: ClinicalActor, permission: ClinicalPermission) {
    if (!await this.permissions.allows(actor.roles, [permission])) throw forbidden();
  }

  private async noteIsSigned(noteId: string, clinicId: string) {
    const note = await this.prisma.clinicalNote.findFirst({ where: { id: noteId, clinicId }, include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } } });
    if (!note) throw forbidden();
    return note.revisions[0]?.state === ClinicalNoteRevisionState.SIGNED;
  }

  private async note(patientId: string, clinicId: string, noteId: string) {
    const note = await this.prisma.clinicalNote.findFirst({ where: { id: noteId, patientId, clinicId }, select: { id: true } });
    if (!note) throw forbidden();
  }

  private async record(kind: ClinicalRecordKind, id: string, patientId: string, clinicId: string) {
    const where = { id, patientId, clinicId };
    const root = kind === 'DIAGNOSIS' ? await this.prisma.diagnosis.findFirst({ where, select: { id: true } }) : kind === 'ALLERGY' ? await this.prisma.allergyRecord.findFirst({ where, select: { id: true } }) : kind === 'CONDITION' ? await this.prisma.conditionRecord.findFirst({ where, select: { id: true } }) : await this.prisma.medicationStatement.findFirst({ where, select: { id: true } });
    if (!root) throw forbidden();
  }

  private async recordIsSigned(kind: ClinicalRecordKind, id: string, clinicId: string) {
    const where = { id, clinicId };
    const root = kind === 'DIAGNOSIS' ? await this.prisma.diagnosis.findFirst({ where }) : kind === 'ALLERGY' ? await this.prisma.allergyRecord.findFirst({ where }) : kind === 'CONDITION' ? await this.prisma.conditionRecord.findFirst({ where }) : await this.prisma.medicationStatement.findFirst({ where });
    if (!root) throw forbidden();
    const revision = await this.prisma.clinicalRecordRevision.findFirst({ where: this.revisionFilter(kind, id, root.currentRevisionNumber) });
    return revision?.state === ClinicalRecordRevisionState.SIGNED;
  }

  private revisionFilter(kind: ClinicalRecordKind, id: string, revisionNumber: number): Prisma.ClinicalRecordRevisionWhereInput {
    return kind === 'DIAGNOSIS' ? { diagnosisId: id, revisionNumber } : kind === 'ALLERGY' ? { allergyRecordId: id, revisionNumber } : kind === 'CONDITION' ? { conditionRecordId: id, revisionNumber } : { medicationStatementId: id, revisionNumber };
  }

  private matchesRevision(kind: ClinicalRecordKind, id: string, revision: { diagnosisId: string | null; allergyRecordId: string | null; conditionRecordId: string | null; medicationStatementId: string | null }) {
    return kind === 'DIAGNOSIS' ? revision.diagnosisId === id : kind === 'ALLERGY' ? revision.allergyRecordId === id : kind === 'CONDITION' ? revision.conditionRecordId === id : revision.medicationStatementId === id;
  }

  private noteRevision(revision: { id: string; revisionNumber: number; previousRevisionId: string | null; state: ClinicalNoteRevisionState; content: string; isPrivate: boolean; patientSummary: string | null; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null; signedAt: Date | null; signedByUserId: string | null; publishedAt: Date | null; publishedByUserId: string | null }) {
    return { ...revision };
  }

  private recordRevision(revision: { id: string; revisionNumber: number; previousRevisionId: string | null; state: ClinicalRecordRevisionState; content: Prisma.JsonValue; isPrivate: boolean; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null; signedAt: Date | null; signedByUserId: string | null }) {
    return { ...revision };
  }
}

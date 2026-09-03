import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { ClinicalNoteRevisionState, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';

export type CreateClinicalNoteInput = {
  expectedRevision: number;
  content: string;
  isPrivate?: boolean;
  patientSummary?: string | null;
};

export type SaveClinicalNoteInput = CreateClinicalNoteInput & {
  amendmentReasonCategory?: string | null;
};

const forbidden = () => new ConflictException({
  code: 'CLINICAL_NOTE_FORBIDDEN',
  message: 'The clinical note is not available to this clinic.',
  details: {},
});
const revisionConflict = (currentRevision: number) => new ConflictException({
  code: 'CLINICAL_NOTE_REVISION_CONFLICT',
  message: 'The clinical note revision is no longer current.',
  details: { currentRevision },
});
const signingNotAllowed = () => new ConflictException({
  code: 'CLINICAL_NOTE_SIGNING_NOT_ALLOWED',
  message: 'Only the current draft clinical note revision may be signed.',
  details: {},
});
const amendmentReasonRequired = () => new UnprocessableEntityException({
  code: 'CLINICAL_NOTE_AMENDMENT_REASON_REQUIRED',
  message: 'An amendment reason category is required when revising signed content.',
  details: {},
});

@Injectable()
export class ClinicalNotesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: ClinicalAccessAuditService) {}

  async create(encounterId: string, input: CreateClinicalNoteInput, actorUserId: string, auditContext?: ClinicalAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const encounter = await this.encounter(tx, encounterId);
      if (input.expectedRevision !== 0) throw revisionConflict(0);

      const note = await tx.clinicalNote.create({
        data: {
          clinicId: encounter.clinicId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          currentRevisionNumber: 1,
          currentEffectiveRevisionNumber: 1,
          revisions: {
            create: this.draftRevision(1, input, actorUserId),
          },
        },
        include: { revisions: true },
      });
      if (auditContext) await this.audit.record({ clinicId: encounter.clinicId, patientId: encounter.patientId, action: 'CREATE', resourceType: 'CLINICAL_NOTE', resourceId: note.id, resourceRevisionId: note.revisions[0].id, metadata: { revisionNumber: 1 } }, auditContext, tx);

      return this.noteResponse(note, note.revisions[0]);
    });
  }

  async save(noteId: string, input: SaveClinicalNoteInput, actorUserId: string, auditContext?: ClinicalAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockNote(tx, noteId);
      const note = await this.note(tx, noteId);
      if (note.currentRevisionNumber !== input.expectedRevision) throw revisionConflict(note.currentRevisionNumber);
      const previous = note.revisions[0];
      if (!previous) throw revisionConflict(0);
      const amendmentReasonCategory = this.reason(input.amendmentReasonCategory);
      if (previous.state === ClinicalNoteRevisionState.SIGNED && !amendmentReasonCategory) throw amendmentReasonRequired();

      const revisionNumber = note.currentRevisionNumber + 1;
      const revision = await tx.clinicalNoteRevision.create({
        data: { clinicalNoteId: note.id, ...this.draftRevision(revisionNumber, input, actorUserId, previous.id, amendmentReasonCategory) },
      });
      const updated = await tx.clinicalNote.update({
        where: { id: note.id },
        data: {
          currentRevisionNumber: revisionNumber,
          currentEffectiveRevisionNumber: revisionNumber,
        },
      });
      if (auditContext) await this.audit.record({ clinicId: note.clinicId, patientId: note.patientId, action: 'UPDATE', resourceType: 'CLINICAL_NOTE', resourceId: note.id, resourceRevisionId: revision.id, metadata: { revisionNumber, amendmentReasonCategory: amendmentReasonCategory ?? null } }, auditContext, tx);

      return this.noteResponse(updated, revision);
    });
  }

  async sign(noteId: string, revisionNumber: number, expectedRevision: number, actorUserId: string, auditContext?: ClinicalAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockNote(tx, noteId);
      const note = await this.note(tx, noteId);
      if (note.currentRevisionNumber !== expectedRevision) throw revisionConflict(note.currentRevisionNumber);
      if (revisionNumber !== note.currentRevisionNumber) throw signingNotAllowed();
      const revision = note.revisions[0];
      if (!revision || revision.revisionNumber !== revisionNumber) throw signingNotAllowed();
      if (revision.state === ClinicalNoteRevisionState.SIGNED) return this.noteResponse(note, revision);
      if (revision.state !== ClinicalNoteRevisionState.DRAFT) throw signingNotAllowed();

      const signed = await tx.clinicalNoteRevision.update({
        where: { id: revision.id },
        data: {
          state: ClinicalNoteRevisionState.SIGNED,
          signedAt: new Date(),
          signedByUserId: actorUserId,
          integrityHash: this.integrityHash(note.id, revision),
        },
      });
      const updated = await tx.clinicalNote.update({
        where: { id: note.id },
        data: { latestSignedRevisionNumber: signed.revisionNumber },
      });
      if (auditContext) await this.audit.record({ clinicId: note.clinicId, patientId: note.patientId, action: 'SIGN', resourceType: 'CLINICAL_NOTE', resourceId: note.id, resourceRevisionId: signed.id, metadata: { revisionNumber: signed.revisionNumber } }, auditContext, tx);

      return this.noteResponse(updated, signed);
    });
  }

  private async encounter(tx: Prisma.TransactionClient, encounterId: string) {
    const clinic = await this.clinic(tx);
    const encounter = await tx.encounter.findFirst({ where: { id: encounterId, clinicId: clinic.id } });
    if (!encounter) throw forbidden();
    return encounter;
  }

  private async note(tx: Prisma.TransactionClient, noteId: string) {
    const clinic = await this.clinic(tx);
    const note = await tx.clinicalNote.findFirst({
      where: { id: noteId, clinicId: clinic.id },
      include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
    });
    if (!note) throw forbidden();
    return note;
  }

  private async clinic(tx: Prisma.TransactionClient) {
    const clinic = await tx.clinic.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } });
    if (!clinic) throw forbidden();
    return clinic;
  }

  private async lockNote(tx: Prisma.TransactionClient, noteId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`clinical-note:${noteId}`}, 0))::text AS locked`;
  }

  private draftRevision(revisionNumber: number, input: CreateClinicalNoteInput, actorUserId: string, previousRevisionId?: string, amendmentReasonCategory?: string | null) {
    return {
      revisionNumber,
      previousRevisionId,
      state: ClinicalNoteRevisionState.DRAFT,
      content: this.content(input.content),
      isPrivate: input.isPrivate ?? true,
      patientSummary: input.patientSummary === undefined ? null : this.summary(input.patientSummary),
      amendmentReasonCategory,
      authoredByUserId: actorUserId,
    };
  }

  private content(value: string) {
    const content = value.trim();
    if (!content) throw new UnprocessableEntityException({ code: 'CLINICAL_NOTE_CONTENT_REQUIRED', message: 'Clinical note content must not be blank.', details: {} });
    return content;
  }

  private summary(value: string | null) {
    const summary = value?.trim() ?? null;
    return summary || null;
  }

  private reason(value: string | null | undefined) {
    const reason = value?.trim() ?? null;
    return reason || null;
  }

  private integrityHash(noteId: string, revision: { revisionNumber: number; previousRevisionId: string | null; content: string; isPrivate: boolean; patientSummary: string | null; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null }) {
    const canonical = JSON.stringify({ noteId, revisionNumber: revision.revisionNumber, previousRevisionId: revision.previousRevisionId, content: revision.content, isPrivate: revision.isPrivate, patientSummary: revision.patientSummary, amendmentReasonCategory: revision.amendmentReasonCategory, authoredAt: revision.authoredAt.toISOString(), authoredByUserId: revision.authoredByUserId });
    return createHash('sha256').update(canonical).digest('hex');
  }

  private noteResponse(note: { id: string; encounterId: string; patientId: string; currentRevisionNumber: number; currentEffectiveRevisionNumber: number | null; latestSignedRevisionNumber: number | null; currentPublishedRevisionNumber: number | null }, revision: { id: string; revisionNumber: number; previousRevisionId: string | null; state: ClinicalNoteRevisionState; content: string; isPrivate: boolean; patientSummary: string | null; amendmentReasonCategory: string | null; authoredAt: Date; authoredByUserId: string | null; signedAt: Date | null; signedByUserId: string | null; integrityHash: string | null }) {
    return {
      id: note.id,
      encounterId: note.encounterId,
      patientId: note.patientId,
      currentRevision: note.currentRevisionNumber,
      currentEffectiveRevision: note.currentEffectiveRevisionNumber,
      latestSignedRevision: note.latestSignedRevisionNumber,
      currentPublishedRevision: note.currentPublishedRevisionNumber,
      revision: {
        id: revision.id,
        revisionNumber: revision.revisionNumber,
        previousRevisionId: revision.previousRevisionId,
        state: revision.state,
        content: revision.content,
        isPrivate: revision.isPrivate,
        patientSummary: revision.patientSummary,
        amendmentReasonCategory: revision.amendmentReasonCategory,
        authoredAt: revision.authoredAt,
        authoredByUserId: revision.authoredByUserId,
        signedAt: revision.signedAt,
        signedByUserId: revision.signedByUserId,
        integrityHash: revision.integrityHash,
      },
    };
  }
}

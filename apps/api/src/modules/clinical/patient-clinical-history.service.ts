import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { EncounterState, PatientAccessAction, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClinicalAccessAuditService, type ClinicalAuditContext } from './clinical-access-audit.service';

const patientMissing = () => new NotFoundException({
  code: 'PATIENT_PROFILE_NOT_FOUND',
  message: 'Patient profile was not found.',
  details: {},
});

const summaryUnavailable = () => new ForbiddenException({
  code: 'CLINICAL_SUMMARY_FORBIDDEN',
  message: 'The clinical summary is not available to this patient.',
  details: {},
});

type PatientClinicalHistoryItem = {
  encounterId: string;
  appointmentId: string;
  completedAt: Date;
  revisionNumber: number;
  patientSummary: string;
  publishedAt: Date;
};

@Injectable()
export class PatientClinicalHistoryService {
  constructor(private readonly prisma: PrismaService, private readonly audit: ClinicalAccessAuditService) {}

  async timeline(userId: string) {
    const { items } = await this.data(userId);
    return { items: [...items].sort((left, right) => left.completedAt.getTime() - right.completedAt.getTime() || left.publishedAt.getTime() - right.publishedAt.getTime() || left.revisionNumber - right.revisionNumber) };
  }

  async history(userId: string) {
    const { items } = await this.data(userId);
    return { items: [...items].sort((left, right) => right.completedAt.getTime() - left.completedAt.getTime() || right.publishedAt.getTime() - left.publishedAt.getTime() || right.revisionNumber - left.revisionNumber) };
  }

  async summary(userId: string, appointmentId: string) {
    const { items } = await this.data(userId);
    const item = items.filter((candidate) => candidate.appointmentId === appointmentId).sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime() || right.revisionNumber - left.revisionNumber)[0];
    if (!item) throw summaryUnavailable();
    return item;
  }

  async auditedTimeline(userId: string, context: ClinicalAuditContext) {
    return this.audited(userId, context, 'TIMELINE');
  }

  async auditedHistory(userId: string, context: ClinicalAuditContext) {
    return this.audited(userId, context, 'HISTORY');
  }

  async auditedSummary(userId: string, appointmentId: string, context: ClinicalAuditContext) {
    return this.audited(userId, context, 'SUMMARY', appointmentId);
  }

  private async audited(userId: string, context: ClinicalAuditContext, view: 'TIMELINE' | 'HISTORY' | 'SUMMARY', appointmentId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const { patient, items } = await this.data(userId, tx);
      const result = view === 'TIMELINE'
        ? { items: this.timelineOrder(items) }
        : view === 'HISTORY'
          ? { items: this.historyOrder(items) }
          : this.summaryItem(items, appointmentId!);
      await this.audit.record({ clinicId: patient.clinicId, patientId: patient.id, action: PatientAccessAction.READ, resourceType: 'PATIENT_CLINICAL_HISTORY', resourceId: view === 'SUMMARY' ? appointmentId : undefined, metadata: { view } }, context, tx);
      return result;
    });
  }

  private timelineOrder(items: PatientClinicalHistoryItem[]) { return [...items].sort((left, right) => left.completedAt.getTime() - right.completedAt.getTime() || left.publishedAt.getTime() - right.publishedAt.getTime() || left.revisionNumber - right.revisionNumber); }
  private historyOrder(items: PatientClinicalHistoryItem[]) { return [...items].sort((left, right) => right.completedAt.getTime() - left.completedAt.getTime() || right.publishedAt.getTime() - left.publishedAt.getTime() || right.revisionNumber - left.revisionNumber); }
  private summaryItem(items: PatientClinicalHistoryItem[], appointmentId: string) { const item = items.filter((candidate) => candidate.appointmentId === appointmentId).sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime() || right.revisionNumber - left.revisionNumber)[0]; if (!item) throw summaryUnavailable(); return item; }

  private async data(userId: string, tx: PrismaService | Prisma.TransactionClient = this.prisma): Promise<{ patient: { id: string; clinicId: string }; items: PatientClinicalHistoryItem[] }> {
    const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw patientMissing();

    const notes = await tx.clinicalNote.findMany({
      where: {
        clinicId: patient.clinicId,
        patientId: patient.id,
        currentPublishedRevisionNumber: { not: null },
        encounter: { state: EncounterState.COMPLETED },
      },
      select: {
        currentPublishedRevisionNumber: true,
        encounter: { select: { id: true, appointmentId: true, completedAt: true } },
        revisions: {
          where: { publishedAt: { not: null }, patientSummary: { not: null }, publishedByUserId: { not: null } },
          select: { revisionNumber: true, patientSummary: true, publishedAt: true },
        },
      },
    });

    const items = notes.flatMap((note) => {
      const revision = note.revisions.find((candidate) => candidate.revisionNumber === note.currentPublishedRevisionNumber);
      if (!revision || !note.encounter.completedAt || !revision.patientSummary || !revision.publishedAt) return [];
      return [{
        encounterId: note.encounter.id,
        appointmentId: note.encounter.appointmentId,
        completedAt: note.encounter.completedAt,
        revisionNumber: revision.revisionNumber,
        patientSummary: revision.patientSummary,
        publishedAt: revision.publishedAt,
      }];
    });
    return { patient, items };
  }
}

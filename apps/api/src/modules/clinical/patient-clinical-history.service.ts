import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { EncounterState } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async timeline(userId: string) {
    const items = await this.items(userId);
    return { items: [...items].sort((left, right) => left.completedAt.getTime() - right.completedAt.getTime() || left.publishedAt.getTime() - right.publishedAt.getTime() || left.revisionNumber - right.revisionNumber) };
  }

  async history(userId: string) {
    const items = await this.items(userId);
    return { items: [...items].sort((left, right) => right.completedAt.getTime() - left.completedAt.getTime() || right.publishedAt.getTime() - left.publishedAt.getTime() || right.revisionNumber - left.revisionNumber) };
  }

  async summary(userId: string, appointmentId: string) {
    const items = await this.items(userId);
    const item = items.filter((candidate) => candidate.appointmentId === appointmentId).sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime() || right.revisionNumber - left.revisionNumber)[0];
    if (!item) throw summaryUnavailable();
    return item;
  }

  private async items(userId: string): Promise<PatientClinicalHistoryItem[]> {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw patientMissing();

    const notes = await this.prisma.clinicalNote.findMany({
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

    return notes.flatMap((note) => {
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
  }
}

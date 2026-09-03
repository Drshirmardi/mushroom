import { ConflictException, Injectable } from '@nestjs/common';

import { EncounterState, Prisma } from '../../generated/prisma/client';

type EncounterAppointment = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startedAt: Date | null;
};

const invalidEncounterState = () => new ConflictException({
  code: 'ENCOUNTER_INVALID_TRANSITION',
  message: 'The encounter cannot make the requested transition.',
  details: {},
});

@Injectable()
export class EncounterLifecycleService {
  async ensureStarted(
    tx: Prisma.TransactionClient,
    appointment: EncounterAppointment,
    actorUserId: string,
    startedAt: Date,
  ) {
    return tx.encounter.upsert({
      where: { appointmentId: appointment.id },
      create: {
        clinicId: appointment.clinicId,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        state: EncounterState.IN_PROGRESS,
        startedAt,
        startedByUserId: actorUserId,
      },
      update: {},
    });
  }

  async complete(
    tx: Prisma.TransactionClient,
    appointment: EncounterAppointment,
    actorUserId: string,
    completedAt: Date,
  ) {
    const encounter = await tx.encounter.findUnique({ where: { appointmentId: appointment.id } });
    if (!encounter || encounter.clinicId !== appointment.clinicId) throw invalidEncounterState();
    if (encounter.state === EncounterState.COMPLETED) return encounter;
    if (encounter.state !== EncounterState.IN_PROGRESS) throw invalidEncounterState();

    return tx.encounter.update({
      where: { id: encounter.id },
      data: {
        state: EncounterState.COMPLETED,
        completedAt,
        completedByUserId: actorUserId,
      },
    });
  }
}

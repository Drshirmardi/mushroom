import { Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';

import { OutboxService } from './outbox.service';

@Injectable()
export class ReminderService {
  constructor(private readonly outbox: OutboxService) {}

  async appointment(tx: Prisma.TransactionClient, input: { id: string; clinicId: string; patientId: string; recipientId: string; startsAt: Date }) {
    return this.outbox.enqueue(tx, {
      eventType: 'PATIENT_REMINDER', aggregateType: 'APPOINTMENT', aggregateId: input.id,
      idempotencyKey: `appointment-reminder:${input.id}:${input.startsAt.toISOString()}`,
      availableAt: input.startsAt,
      payload: { patientId: input.patientId, clinicId: input.clinicId, recipientId: input.recipientId, category: 'REMINDER', title: 'یادآوری نوبت', body: 'نوبت شما نزدیک است.' },
    });
  }

  async treatment(tx: Prisma.TransactionClient, input: { id: string; clinicId: string; patientId: string; recipientId: string; scheduledFor: Date }) {
    return this.outbox.enqueue(tx, {
      eventType: 'PATIENT_REMINDER', aggregateType: 'TREATMENT_TASK', aggregateId: input.id,
      idempotencyKey: `treatment-reminder:${input.id}:${input.scheduledFor.toISOString()}`,
      availableAt: input.scheduledFor,
      payload: { patientId: input.patientId, clinicId: input.clinicId, recipientId: input.recipientId, category: 'TREATMENT', title: 'یادآوری درمان', body: 'زمان اقدام درمانی شما رسیده است.' },
    });
  }

  async cancelAppointment(tx: Prisma.TransactionClient, appointmentId: string, reason: string) {
    await this.outbox.cancel(tx, 'APPOINTMENT', appointmentId, reason);
  }

  async cancelTreatmentTask(tx: Prisma.TransactionClient, taskId: string, reason: string) {
    await this.outbox.cancel(tx, 'TREATMENT_TASK', taskId, reason);
  }
}

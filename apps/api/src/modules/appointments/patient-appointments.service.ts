import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { AppointmentStatus, AppointmentStatusHistoryAction } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PatientBookingEligibilityService } from '../assessments/patient/patient-booking-eligibility.service';
import { PatientAvailabilityService } from '../scheduling/patient-availability.service';
import type { CreatePatientAppointmentDto } from './patient-appointments.dto';

const invalidKey = () => new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'An Idempotency-Key header is required.', details: {} });
const keyReused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The Idempotency-Key was already used for a different request.', details: {} });
const ineligible = () => new UnprocessableEntityException({ code: 'BOOKING_INELIGIBLE', message: 'Booking eligibility is no longer satisfied.', details: {} });
const unavailable = () => new ConflictException({ code: 'APPOINTMENT_SLOT_UNAVAILABLE', message: 'The requested appointment slot is no longer available.', details: {} });
const conflict = () => new ConflictException({ code: 'APPOINTMENT_SLOT_CONFLICT', message: 'The requested appointment slot conflicts with an active appointment.', details: {} });

type AppointmentResult = Awaited<ReturnType<PatientAppointmentsService['response']>>;

@Injectable()
export class PatientAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: PatientBookingEligibilityService,
    private readonly availability: PatientAvailabilityService,
  ) {}

  async create(userId: string, body: CreatePatientAppointmentDto, rawKey: string | string[] | undefined): Promise<AppointmentResult> {
    const key = this.idempotencyKey(rawKey);
    const startsAt = new Date(body.startsAt);
    const requestHash = this.requestHash(body.doctorServiceId, startsAt);
    const existing = await this.prisma.appointment.findUnique({ where: { idempotencyActorUserId_idempotencyKey: { idempotencyActorUserId: userId, idempotencyKey: key } } });
    if (existing) return this.idempotentResult(existing, requestHash);

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        // The public slot is only a hint. Recheck the mutable Phase 03 and Phase 04 inputs at
        // the commit boundary; the database exclusion constraint is the final capacity authority.
        const decision = await this.eligibility.get(userId);
        if (!decision.eligible) throw ineligible();
        const candidate = await this.availability.candidate(userId, body.doctorServiceId, startsAt);
        if (!candidate) throw unavailable();
        const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
        const offering = await tx.doctorService.findFirst({
          where: { id: body.doctorServiceId, clinicId: patient?.clinicId, isActive: true, publicationStatus: 'PUBLISHED', doctor: { isActive: true, publicationStatus: 'PUBLISHED' }, service: { isActive: true, publicationStatus: 'PUBLISHED' } },
          select: { id: true, clinicId: true, doctorId: true, durationMinutes: true, priceAmount: true, currency: true },
        });
        if (!patient || !offering || candidate.endsAt.getTime() !== startsAt.getTime() + offering.durationMinutes * 60_000) throw unavailable();
        const now = new Date();
        const hold = await tx.appointmentHold.create({ data: { clinicId: patient.clinicId, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt, endsAt: candidate.endsAt, expiresAt: new Date(now.getTime() + 60_000) } });
        const created = await tx.appointment.create({
          data: {
            clinicId: patient.clinicId,
            patientId: patient.id,
            doctorServiceId: offering.id,
            doctorId: offering.doctorId,
            startsAt,
            endsAt: candidate.endsAt,
            status: AppointmentStatus.PENDING,
            priceAmount: offering.priceAmount,
            currency: offering.currency,
            priceCapturedAt: now,
            idempotencyActorUserId: userId,
            idempotencyKey: key,
            idempotencyRequestHash: requestHash,
            statusHistory: { create: { fromStatus: null, toStatus: AppointmentStatus.PENDING, action: AppointmentStatusHistoryAction.CREATED, actorUserId: userId, metadata: {} } },
          },
        });
        await tx.appointmentHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
        return created;
      });
      return this.response(appointment);
    } catch (error) {
      const raced = await this.prisma.appointment.findUnique({ where: { idempotencyActorUserId_idempotencyKey: { idempotencyActorUserId: userId, idempotencyKey: key } } });
      if (raced) return this.idempotentResult(raced, requestHash);
      if (this.isExclusion(error)) throw conflict();
      throw error;
    }
  }

  private idempotencyKey(value: string | string[] | undefined) {
    const key = Array.isArray(value) ? undefined : value?.trim();
    if (!key || key.length > 255) throw invalidKey();
    return key;
  }

  private requestHash(doctorServiceId: string, startsAt: Date) {
    return createHash('sha256').update(JSON.stringify({ doctorServiceId, startsAt: startsAt.toISOString() })).digest('hex');
  }

  private idempotentResult(appointment: { idempotencyRequestHash: string | null } & Parameters<PatientAppointmentsService['response']>[0], requestHash: string) {
    if (appointment.idempotencyRequestHash !== requestHash) throw keyReused();
    return this.response(appointment);
  }

  private isExclusion(error: unknown) {
    const text = `${JSON.stringify(error)} ${error instanceof Error ? error.message : ''}`;
    return text.includes('23P01') || text.includes('appointments_no_active_doctor_overlap');
  }

  private response(appointment: { id: string; clinicId: string; patientId: string; doctorServiceId: string; doctorId: string; startsAt: Date; endsAt: Date; status: AppointmentStatus; priceAmount: number; currency: string; priceCapturedAt: Date; createdAt: Date }) {
    return appointment;
  }
}

import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';
import { createHash } from 'node:crypto';

import { AppointmentStatus, AppointmentStatusHistoryAction, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PatientBookingEligibilityService } from '../assessments/patient/patient-booking-eligibility.service';
import { PatientAvailabilityService } from '../scheduling/patient-availability.service';
import { ReminderService } from '../outbox/reminder.service';
import type { AppointmentTimelineQueryDto, CreatePatientAppointmentDto, PatientAppointmentListQueryDto } from './patient-appointments.dto';

const invalidKey = () => new UnprocessableEntityException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'An Idempotency-Key header is required.', details: {} });
const keyReused = () => new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The Idempotency-Key was already used for a different request.', details: {} });
const ineligible = () => new UnprocessableEntityException({ code: 'BOOKING_INELIGIBLE', message: 'Booking eligibility is no longer satisfied.', details: {} });
const unavailable = () => new ConflictException({ code: 'APPOINTMENT_SLOT_UNAVAILABLE', message: 'The requested appointment slot is no longer available.', details: {} });
const conflict = () => new ConflictException({ code: 'APPOINTMENT_SLOT_CONFLICT', message: 'The requested appointment slot conflicts with an active appointment.', details: {} });
const forbidden = () => new ForbiddenException({ code: 'APPOINTMENT_FORBIDDEN', message: 'The appointment is not available to this patient.', details: {} });
const changeNotAllowed = () => new ConflictException({ code: 'APPOINTMENT_CHANGE_NOT_ALLOWED', message: 'This appointment cannot be changed.', details: {} });

type AppointmentResult = Awaited<ReturnType<PatientAppointmentsService['response']>>;

@Injectable()
export class PatientAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: PatientBookingEligibilityService,
    private readonly availability: PatientAvailabilityService,
    private readonly reminders: ReminderService,
    private readonly billing: BillingService,
  ) {}

  async create(userId: string, body: CreatePatientAppointmentDto, rawKey: string | string[] | undefined): Promise<AppointmentResult> {
    const key = this.idempotencyKey(rawKey);
    const startsAt = new Date(body.startsAt);
    const requestHash = this.requestHash(body.doctorServiceId, startsAt);
    const existing = await this.prisma.appointment.findUnique({ where: { idempotencyActorUserId_idempotencyKey: { idempotencyActorUserId: userId, idempotencyKey: key } } });
    if (existing) return this.idempotentResult(existing, requestHash);
    const priced = await this.prisma.doctorService.findUnique({ where: { id: body.doctorServiceId }, select: { priceAmount: true } });
    if (priced && priced.priceAmount > 0) throw new ConflictException({ code: 'APPOINTMENT_PAYMENT_REQUIRED', message: 'Full payment through a booking intent is required.', details: { nextAction: 'CREATE_APPOINTMENT_BILLING_INTENT' } });
    // These checks use the shared client. Running them from an interactive transaction would
    // pin every pool connection during a concurrent booking burst, preventing the checks from
    // acquiring a connection at all. Capacity itself is rechecked after the transaction lock.
    const decision = await this.eligibility.get(userId);
    if (!decision.eligible) throw ineligible();
    const candidate = await this.availability.candidate(userId, body.doctorServiceId, startsAt);
    if (!candidate) throw unavailable();

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
        const offering = await tx.doctorService.findFirst({
          where: { id: body.doctorServiceId, clinicId: patient?.clinicId, isActive: true, publicationStatus: 'PUBLISHED', doctor: { isActive: true, publicationStatus: 'PUBLISHED' }, service: { isActive: true, publicationStatus: 'PUBLISHED' } },
          select: { id: true, clinicId: true, doctorId: true, durationMinutes: true, priceAmount: true, currency: true },
        });
        if (!patient || !offering || candidate.endsAt.getTime() !== startsAt.getTime() + offering.durationMinutes * 60_000) throw unavailable();
        await this.lockCapacity(tx, patient.clinicId, offering.doctorId, startsAt);
        const active = await tx.appointment.findFirst({ where: { clinicId: patient.clinicId, doctorId: offering.doctorId, startsAt, endsAt: candidate.endsAt, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN, AppointmentStatus.QUEUED, AppointmentStatus.IN_PROGRESS] } }, select: { id: true } });
        if (active) throw conflict();
        const now = new Date();
        const hold = await tx.appointmentHold.create({ data: { clinicId: patient.clinicId, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt, endsAt: candidate.endsAt, expiresAt: new Date(now.getTime() + 60_000) } });
        await tx.appointmentHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
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
        await this.activity(tx, created, 'APPOINTMENT_CREATED', { action: AppointmentStatusHistoryAction.CREATED });
        await this.reminders.appointment(tx, { id: created.id, clinicId: patient.clinicId, patientId: patient.id, recipientId: userId, startsAt: created.startsAt });
        await tx.appointmentHold.update({ where: { id: hold.id }, data: { releasedAt: new Date() } });
        return created;
      }, { maxWait: 30_000, timeout: 30_000 });
      return this.response(appointment);
    } catch (error) {
      const raced = await this.prisma.appointment.findUnique({ where: { idempotencyActorUserId_idempotencyKey: { idempotencyActorUserId: userId, idempotencyKey: key } } });
      if (raced) return this.idempotentResult(raced, requestHash);
      if (this.isExclusion(error)) throw conflict();
      throw error;
    }
  }

  async list(userId: string, query: PatientAppointmentListQueryDto) {
    const patient = await this.patient(userId);
    const where = { clinicId: patient.clinicId, patientId: patient.id };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({ where, orderBy: [{ startsAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { items: items.map((item) => this.response(item)), page: query.page, pageSize: query.pageSize, total };
  }

  async get(userId: string, id: string) { return this.response(await this.owned(userId, id)); }

  async history(userId: string, id: string, query: AppointmentTimelineQueryDto) {
    const appointment = await this.owned(userId, id);
    const where = { appointmentId: appointment.id };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.appointmentStatusHistory.count({ where }),
      this.prisma.appointmentStatusHistory.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { items: items.map((item) => ({ id: item.id, fromStatus: item.fromStatus, toStatus: item.toStatus, action: item.action, reason: item.reason, metadata: item.metadata as Record<string, unknown>, createdAt: item.createdAt })), page: query.page, pageSize: query.pageSize, total };
  }

  async cancel(userId: string, id: string, rawReason?: string) {
    const reason = rawReason?.trim() || null;
    return this.prisma.$transaction(async (tx) => {
      const appointment = await this.owned(userId, id, tx);
      if ((appointment.status !== AppointmentStatus.PENDING && appointment.status !== AppointmentStatus.CONFIRMED) || appointment.startsAt <= new Date()) throw changeNotAllowed();
      const cancelled = await tx.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason, statusHistory: { create: { fromStatus: appointment.status, toStatus: AppointmentStatus.CANCELLED, action: AppointmentStatusHistoryAction.CANCELLED, actorUserId: userId, reason, metadata: {} } } } });
      await this.billing.cancelAppointment(tx, cancelled.id, { actorUserId: userId, actorSessionId: null, requestId: `appointment-cancel:${id}`, ipAddress: null });
      await this.reminders.cancelAppointment(tx, cancelled.id, 'Appointment cancelled');
      await this.activity(tx, cancelled, 'APPOINTMENT_CANCELLED', { action: AppointmentStatusHistoryAction.CANCELLED });
      return this.response(cancelled);
    });
  }

  async reschedule(userId: string, id: string, body: CreatePatientAppointmentDto) {
    const startsAt = new Date(body.startsAt);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const appointment = await this.owned(userId, id, tx);
        if ((appointment.status !== AppointmentStatus.PENDING && appointment.status !== AppointmentStatus.CONFIRMED) || appointment.startsAt <= new Date()) throw changeNotAllowed();
        const decision = await this.eligibility.get(userId);
        if (!decision.eligible) throw ineligible();
        const candidate = await this.availability.candidate(userId, body.doctorServiceId, startsAt);
        if (!candidate) throw unavailable();
        const offering = await tx.doctorService.findFirst({ where: { id: body.doctorServiceId, clinicId: appointment.clinicId, isActive: true, publicationStatus: 'PUBLISHED', doctor: { isActive: true, publicationStatus: 'PUBLISHED' }, service: { isActive: true, publicationStatus: 'PUBLISHED' } }, select: { id: true, doctorId: true, durationMinutes: true, priceAmount: true, currency: true } });
        if (!offering || candidate.endsAt.getTime() !== startsAt.getTime() + offering.durationMinutes * 60_000) throw unavailable();
        const now = new Date();
        await this.billing.assertReschedulePrice(tx, id, offering.priceAmount);
        const updated = await tx.appointment.update({ where: { id }, data: { doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt, endsAt: candidate.endsAt, status: AppointmentStatus.PENDING, priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: now, statusHistory: { create: { fromStatus: appointment.status, toStatus: AppointmentStatus.PENDING, action: AppointmentStatusHistoryAction.RESCHEDULED, actorUserId: userId, metadata: { previous: { startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString(), priceAmount: appointment.priceAmount, currency: appointment.currency }, current: { startsAt: startsAt.toISOString(), endsAt: candidate.endsAt.toISOString(), priceAmount: offering.priceAmount, currency: offering.currency } } } } } });
        if (appointment.startsAt.getTime() !== updated.startsAt.getTime()) await this.reminders.cancelAppointment(tx, updated.id, 'Appointment rescheduled');
        await this.reminders.appointment(tx, { id: updated.id, clinicId: updated.clinicId, patientId: updated.patientId, recipientId: userId, startsAt: updated.startsAt });
        await this.activity(tx, updated, 'APPOINTMENT_RESCHEDULED', { action: AppointmentStatusHistoryAction.RESCHEDULED });
        return this.response(updated);
      });
    } catch (error) { if (this.isExclusion(error)) throw conflict(); throw error; }
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

  private async lockCapacity(tx: Prisma.TransactionClient, clinicId: string, doctorId: string, startsAt: Date) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`appointment:capacity:${clinicId}:${doctorId}:${startsAt.toISOString()}`}, 0))::text AS locked`;
  }

  private async patient(userId: string) {
    const patient = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    if (!patient) throw new NotFoundException({ code: 'PATIENT_PROFILE_NOT_FOUND', message: 'Patient profile was not found.', details: {} });
    return patient;
  }

  private async owned(userId: string, id: string, tx: PrismaService | Prisma.TransactionClient = this.prisma) {
    const patient = await tx.patientProfile.findUnique({ where: { userId }, select: { id: true, clinicId: true } });
    const appointment = await tx.appointment.findUnique({ where: { id } });
    if (!patient || !appointment || appointment.patientId !== patient.id || appointment.clinicId !== patient.clinicId) throw forbidden();
    return appointment;
  }

  private activity(tx: Prisma.TransactionClient, appointment: { id: string; clinicId: string; patientId: string }, type: string, metadata: Record<string, unknown>) {
    return tx.operationalActivity.create({ data: { clinicId: appointment.clinicId, appointmentId: appointment.id, patientId: appointment.patientId, type, metadata: metadata as Prisma.InputJsonValue } });
  }

  private response(appointment: { id: string; clinicId: string; patientId: string; doctorServiceId: string; doctorId: string; startsAt: Date; endsAt: Date; status: AppointmentStatus; priceAmount: number; currency: string; priceCapturedAt: Date; createdAt: Date }) {
    return appointment;
  }
}

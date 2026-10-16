import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BillingIntent, PatientProfile } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../billing/billing-target.registry';
import { financialConflict, lockFinancial, type FinancialContext, type Tx } from '../billing/billing.policy';
import { PatientBookingEligibilityService } from '../assessments/patient/patient-booking-eligibility.service';
import { PatientAvailabilityService } from '../scheduling/patient-availability.service';
import { ReminderService } from '../outbox/reminder.service';

type BookingSnapshot = { doctorServiceId: string; doctorId: string; startsAt: string; endsAt: string; priceAmount: number; currency: string };
@Injectable()
export class AppointmentBillingTarget implements BillingTarget, OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly registry: BillingTargetRegistry, private readonly eligibility: PatientBookingEligibilityService, private readonly availability: PatientAvailabilityService, private readonly reminders: ReminderService, private readonly config: ConfigService) {}
  onModuleInit() { this.registry.register('APPOINTMENT', this); }
  async validateSettlement(intent: BillingIntent) {
    const patient = await this.prisma.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
    const snapshot = intent.snapshot as BookingSnapshot;
    if (!(await this.eligibility.get(patient.userId)).eligible) return false;
    return Boolean(await this.availability.candidate(patient.userId, snapshot.doctorServiceId, new Date(snapshot.startsAt)));
  }
  async prepare(patient: PatientProfile, input: Record<string, string>): Promise<PreparedTarget> {
    const startsAt = new Date(input.startsAt);
    if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date() || !(await this.eligibility.get(patient.userId)).eligible) throw financialConflict('BOOKING_INELIGIBLE');
    const candidate = await this.availability.candidate(patient.userId, input.doctorServiceId, startsAt);
    const service = await this.prisma.doctorService.findFirst({ where: { id: input.doctorServiceId, clinicId: patient.clinicId, isActive: true, publicationStatus: 'PUBLISHED', doctor: { isActive: true, publicationStatus: 'PUBLISHED' }, service: { isActive: true, publicationStatus: 'PUBLISHED' } } });
    if (!candidate || !service || service.currency !== 'IRR' || candidate.endsAt.getTime() !== startsAt.getTime() + service.durationMinutes * 60_000) throw financialConflict('APPOINTMENT_SLOT_UNAVAILABLE');
    const ttl = this.config.get<number>('BILLING_BOOKING_HOLD_MINUTES', 10);
    return { amountRial: BigInt(service.priceAmount), snapshot: { doctorServiceId: service.id, doctorId: service.doctorId, startsAt: startsAt.toISOString(), endsAt: candidate.endsAt.toISOString(), priceAmount: service.priceAmount, currency: service.currency }, expiresAt: new Date(Math.min(Date.now() + ttl * 60_000, startsAt.getTime())) };
  }
  async reserve(tx: Tx, patient: PatientProfile, prepared: PreparedTarget) {
    const snapshot = prepared.snapshot as BookingSnapshot;
    await lockFinancial(tx, `billing-doctor:${snapshot.doctorId}`);
    await tx.appointmentHold.updateMany({ where: { doctorId: snapshot.doctorId, releasedAt: null, expiresAt: { lte: new Date() } }, data: { releasedAt: new Date() } });
    const active = await tx.appointment.count({ where: { clinicId: patient.clinicId, doctorId: snapshot.doctorId, startsAt: { lt: new Date(snapshot.endsAt) }, endsAt: { gt: new Date(snapshot.startsAt) }, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'QUEUED', 'IN_PROGRESS'] } } });
    const holds = await tx.appointmentHold.count({ where: { clinicId: patient.clinicId, doctorId: snapshot.doctorId, releasedAt: null, expiresAt: { gt: new Date() }, startsAt: { lt: new Date(snapshot.endsAt) }, endsAt: { gt: new Date(snapshot.startsAt) } } });
    if (active || holds) throw financialConflict('APPOINTMENT_SLOT_CONFLICT');
    const hold = await tx.appointmentHold.create({ data: { clinicId: patient.clinicId, doctorId: snapshot.doctorId, doctorServiceId: snapshot.doctorServiceId, startsAt: new Date(snapshot.startsAt), endsAt: new Date(snapshot.endsAt), expiresAt: prepared.expiresAt! } });
    return hold.id;
  }
  async lock(tx: Tx, intent: BillingIntent) { const snapshot = intent.snapshot as BookingSnapshot; await lockFinancial(tx, `billing-doctor:${snapshot.doctorId}`); }
  async canSettle(tx: Tx, intent: BillingIntent) {
    if (!intent.holdId || !intent.expiresAt || intent.expiresAt <= new Date()) return false;
    const snapshot = intent.snapshot as BookingSnapshot;
    const hold = await tx.appointmentHold.findUnique({ where: { id: intent.holdId } });
    const offering = await tx.doctorService.findFirst({ where: { id: snapshot.doctorServiceId, isActive: true, publicationStatus: 'PUBLISHED', doctor: { isActive: true, publicationStatus: 'PUBLISHED' }, service: { isActive: true, publicationStatus: 'PUBLISHED' } } });
    return Boolean(hold && !hold.releasedAt && hold.expiresAt > new Date() && offering && new Date(snapshot.startsAt) > new Date());
  }
  async settle(tx: Tx, intent: BillingIntent, context: FinancialContext) {
    if (!(await this.canSettle(tx, intent))) throw financialConflict('BILLING_HOLD_EXPIRED');
    const snapshot = intent.snapshot as BookingSnapshot;
    await tx.appointmentHold.update({ where: { id: intent.holdId! }, data: { releasedAt: new Date() } });
    const appointment = await tx.appointment.create({ data: { clinicId: intent.clinicId, patientId: intent.patientId, doctorServiceId: snapshot.doctorServiceId, doctorId: snapshot.doctorId, startsAt: new Date(snapshot.startsAt), endsAt: new Date(snapshot.endsAt), priceAmount: snapshot.priceAmount, currency: snapshot.currency, priceCapturedAt: intent.createdAt, idempotencyActorUserId: intent.actorUserId, idempotencyKey: `billing:${intent.id}`, idempotencyRequestHash: intent.fingerprint, statusHistory: { create: { toStatus: 'PENDING', action: 'CREATED', actorUserId: context.actorUserId, metadata: { billingIntentId: intent.id } } } } });
    const patient = await tx.patientProfile.findUniqueOrThrow({ where: { id: intent.patientId } });
    await this.reminders.appointment(tx, { id: appointment.id, clinicId: intent.clinicId, patientId: intent.patientId, recipientId: patient.userId, startsAt: appointment.startsAt });
    await tx.operationalActivity.create({ data: { clinicId: intent.clinicId, patientId: intent.patientId, appointmentId: appointment.id, type: 'APPOINTMENT_CREATED', metadata: { billingIntentId: intent.id } } });
    return appointment.id;
  }
  async refund(_tx: Tx, _intent: BillingIntent, _amountRial: bigint, _refundId: string) { /* Appointment financial history is owned by BillingRefund. */ }
}

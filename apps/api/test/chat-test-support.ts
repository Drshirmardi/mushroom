import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

export type ChatFixture = Awaited<ReturnType<typeof createChatFixture>>;

const phone = () => `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}`;

export async function createChatFixture(app: NestFastifyApplication) {
  const prisma = app.get(PrismaService);
  const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
  const baseOffering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: clinic.id, visitMode: 'ONLINE', isActive: true, publicationStatus: 'PUBLISHED' }, select: { serviceId: true, durationMinutes: true, priceAmount: true, currency: true } });
  const patient = await prisma.user.create({ data: { phone: phone() } });
  const outsider = await prisma.user.create({ data: { phone: phone() } });
  const doctor = await prisma.user.create({ data: { phone: phone() } });
  const admin = await prisma.user.create({ data: { phone: phone() } });
  const staff = await prisma.user.create({ data: { phone: phone() } });
  const patientProfile = await prisma.patientProfile.create({ data: { userId: patient.id, clinicId: clinic.id } });
  await prisma.clinicalClinicAccess.create({ data: { userId: admin.id, clinicId: clinic.id } });
  await prisma.patientProfile.create({ data: { userId: outsider.id, clinicId: clinic.id } });
  const specialty = await prisma.specialty.findFirstOrThrow({ where: { clinicId: clinic.id, isActive: true, publicationStatus: 'PUBLISHED' }, select: { id: true } });
  const profile = await prisma.doctorProfile.create({ data: { clinicId: clinic.id, userId: doctor.id, displayName: `Synthetic chat doctor ${randomUUID()}` } });
  await prisma.doctorSpecialty.create({ data: { clinicId: clinic.id, doctorId: profile.id, specialtyId: specialty.id } });
  await prisma.doctorProfile.update({ where: { id: profile.id }, data: { isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
  const offering = await prisma.doctorService.create({ data: { clinicId: clinic.id, doctorId: profile.id, serviceId: baseOffering.serviceId, visitMode: 'ONLINE', durationMinutes: baseOffering.durationMinutes, priceAmount: baseOffering.priceAmount, currency: baseOffering.currency, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
  const now = new Date();
  const appointment = await prisma.appointment.create({ data: {
    clinicId: clinic.id, patientId: patientProfile.id, doctorServiceId: offering.id, doctorId: offering.doctorId,
    startsAt: new Date(now.getTime() - 5 * 60_000), endsAt: new Date(now.getTime() + 30 * 60_000), status: 'CONFIRMED', confirmedAt: now,
    priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: now,
    idempotencyActorUserId: admin.id, idempotencyKey: randomUUID(), idempotencyRequestHash: randomUUID().replaceAll('-', '').repeat(2),
  } });
  const tokens = await Promise.all([
    app.get(AccessTokenService).issue({ userId: patient.id, sessionId: randomUUID(), roles: ['PATIENT'] }),
    app.get(AccessTokenService).issue({ userId: outsider.id, sessionId: randomUUID(), roles: ['PATIENT'] }),
    app.get(AccessTokenService).issue({ userId: doctor.id, sessionId: randomUUID(), roles: ['DOCTOR'] }),
    app.get(AccessTokenService).issue({ userId: admin.id, sessionId: randomUUID(), roles: ['ADMIN'] }),
    app.get(AccessTokenService).issue({ userId: staff.id, sessionId: randomUUID(), roles: ['STAFF'] }),
  ]);
  return { prisma, clinic, offering, appointment, users: { patient, outsider, doctor, admin, staff }, tokens: { patient: tokens[0], outsider: tokens[1], doctor: tokens[2], admin: tokens[3], staff: tokens[4] } };
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });

export async function destroyChatFixture(fixture: ChatFixture) {
  // Phase 10 persistence deliberately forbids deletion of messages and evidence.
  // Each fixture owns a unique synthetic doctor/service/appointment, so retained
  // integration facts neither collide with nor mutate another run's resources.
  await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } }).catch(() => undefined);
}

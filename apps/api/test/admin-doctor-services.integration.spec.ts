import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('admin doctor-service CRUD (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  const doctorServices = new Set<string>();
  const doctors = new Set<string>();
  const specialties = new Set<string>();
  const services = new Set<string>();
  const clinics = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    token = await app.get(AccessTokenService).issue({ userId: randomUUID(), sessionId: randomUUID(), roles: ['ADMIN'] });
  }, 30_000);

  afterEach(async () => {
    if (doctorServices.size) { await prisma.doctorService.deleteMany({ where: { id: { in: [...doctorServices] } } }); doctorServices.clear(); }
    if (doctors.size) { await prisma.doctorSpecialty.deleteMany({ where: { doctorId: { in: [...doctors] } } }); await prisma.doctorProfile.deleteMany({ where: { id: { in: [...doctors] } } }); doctors.clear(); }
    if (specialties.size) { await prisma.specialty.deleteMany({ where: { id: { in: [...specialties] } } }); specialties.clear(); }
    if (services.size) { await prisma.service.deleteMany({ where: { id: { in: [...services] } } }); services.clear(); }
    if (clinics.size) { await prisma.clinic.deleteMany({ where: { id: { in: [...clinics] } } }); clinics.clear(); }
  });

  afterAll(async () => { await app.close(); });

  const headers = () => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });
  const createParents = async (published = false) => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const suffix = randomUUID().slice(0, 8);
    const publication = published ? { isActive: true, publicationStatus: 'PUBLISHED' as const, publishedAt: new Date() } : {};
    const specialty = await prisma.specialty.create({ data: { clinicId: clinic.id, name: `Specialty ${suffix}`, canonicalName: `specialty ${suffix}`, ...publication } }); specialties.add(specialty.id);
    const doctor = await prisma.doctorProfile.create({ data: { clinicId: clinic.id, displayName: `Doctor ${suffix}` } }); doctors.add(doctor.id);
    if (published) {
      await prisma.doctorSpecialty.create({ data: { clinicId: clinic.id, doctorId: doctor.id, specialtyId: specialty.id } });
      await prisma.doctorProfile.update({ where: { id: doctor.id }, data: publication });
    }
    const service = await prisma.service.create({ data: { clinicId: clinic.id, name: `Service ${suffix}`, canonicalName: `service ${suffix}`, ...publication } }); services.add(service.id);
    return { clinic, doctor, service, suffix };
  };

  it('creates, filters, updates, and deletes a clinic-scoped doctor service', async () => {
    const { doctor, service } = await createParents(true);
    const created = await app.inject({ method: 'POST', url: '/v1/admin/doctor-services', headers: headers(), payload: { doctorId: doctor.id, serviceId: service.id, visitMode: 'ONLINE', durationMinutes: 45, bufferMinutes: 15, priceAmount: 2_500_000, currency: 'IRR', isActive: true, publicationStatus: 'PUBLISHED' } });
    expect(created.statusCode).toBe(201);
    const body = created.json(); doctorServices.add(body.id);
    expect(body).toMatchObject({ doctor: { id: doctor.id, name: doctor.displayName }, service: { id: service.id, name: service.name }, visitMode: 'ONLINE', durationMinutes: 45, bufferMinutes: 15, priceAmount: 2_500_000, currency: 'IRR', isActive: true, publicationStatus: 'PUBLISHED' });

    const duplicate = await app.inject({ method: 'POST', url: '/v1/admin/doctor-services', headers: headers(), payload: { doctorId: doctor.id, serviceId: service.id, visitMode: 'ONLINE', durationMinutes: 30, priceAmount: 0 } });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().code).toBe('DOCTOR_SERVICE_CONFLICT');

    const list = await app.inject({ method: 'GET', url: `/v1/admin/doctor-services?doctorId=${doctor.id}&visitMode=ONLINE&page=1&pageSize=20`, headers: headers() });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ page: 1, pageSize: 20, total: 1, items: [{ id: body.id }] });

    const updated = await app.inject({ method: 'PATCH', url: `/v1/admin/doctor-services/${body.id}`, headers: headers(), payload: { durationMinutes: 60, bufferMinutes: 20, priceAmount: 3_000_000, isActive: false, publicationStatus: 'UNPUBLISHED' } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ durationMinutes: 60, bufferMinutes: 20, priceAmount: 3_000_000, isActive: false, publicationStatus: 'UNPUBLISHED', publishedAt: null });

    const deleted = await app.inject({ method: 'DELETE', url: `/v1/admin/doctor-services/${body.id}`, headers: headers() });
    expect(deleted.statusCode).toBe(204);
    doctorServices.delete(body.id);
    const missing = await app.inject({ method: 'GET', url: `/v1/admin/doctor-services/${body.id}`, headers: headers() });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('DOCTOR_SERVICE_NOT_FOUND');
  });

  it('rejects invalid duration, buffer, currency, parent scope, and publication state', async () => {
    const { doctor, service } = await createParents(false);
    const invalid = await app.inject({ method: 'POST', url: '/v1/admin/doctor-services', headers: headers(), payload: { doctorId: doctor.id, serviceId: service.id, visitMode: 'IN_PERSON', durationMinutes: 400, bufferMinutes: 100, priceAmount: 1 } });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().code).toBe('DOCTOR_SERVICE_INPUT_INVALID');
    const invalidModeOrCurrency = await app.inject({ method: 'POST', url: '/v1/admin/doctor-services', headers: headers(), payload: { doctorId: doctor.id, serviceId: service.id, visitMode: 'HOME', durationMinutes: 30, priceAmount: 1, currency: 'USD' } });
    expect(invalidModeOrCurrency.statusCode).toBe(422);
    expect(invalidModeOrCurrency.json().code).toBe('DOCTOR_SERVICE_INPUT_INVALID');
    const notPublishable = await app.inject({ method: 'POST', url: '/v1/admin/doctor-services', headers: headers(), payload: { doctorId: doctor.id, serviceId: service.id, visitMode: 'IN_PERSON', durationMinutes: 30, priceAmount: 1, publicationStatus: 'PUBLISHED' } });
    expect(notPublishable.statusCode).toBe(409);
    expect(notPublishable.json().code).toBe('DIRECTORY_PUBLICATION_INVALID');
    const otherClinic = await prisma.clinic.create({ data: { name: `Other ${randomUUID()}`, status: 'INACTIVE' } }); clinics.add(otherClinic.id);
    const foreignService = await prisma.service.create({ data: { clinicId: otherClinic.id, name: `Foreign ${randomUUID()}`, canonicalName: `foreign ${randomUUID()}` } }); services.add(foreignService.id);
    const foreign = await app.inject({ method: 'POST', url: '/v1/admin/doctor-services', headers: headers(), payload: { doctorId: doctor.id, serviceId: foreignService.id, visitMode: 'ONLINE', durationMinutes: 30, priceAmount: 1 } });
    expect(foreign.statusCode).toBe(422);
    expect(foreign.json().code).toBe('DOCTOR_SERVICE_INPUT_INVALID');
    const empty = await app.inject({ method: 'PATCH', url: `/v1/admin/doctor-services/${randomUUID()}`, headers: headers(), payload: {} });
    expect(empty.statusCode).toBe(422);
  });
});

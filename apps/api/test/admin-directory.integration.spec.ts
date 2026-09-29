import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createReleaseAdminTestPrincipal, disposeReleaseAdminTestPrincipal, type ReleaseAdminTestPrincipal } from './release-admin-test-support';

describe('admin directory CRUD (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let admin: ReleaseAdminTestPrincipal;
  const doctors = new Set<string>();
  const specialties = new Set<string>();
  const services = new Set<string>();
  const clinics = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    admin = await createReleaseAdminTestPrincipal(prisma, app.get(AccessTokenService));
    token = admin.token;
  }, 30_000);

  afterEach(async () => {
    if (doctors.size) {
      await prisma.doctorSpecialty.deleteMany({ where: { doctorId: { in: [...doctors] } } });
      await prisma.doctorProfile.deleteMany({ where: { id: { in: [...doctors] } } });
      doctors.clear();
    }
    if (specialties.size) { await prisma.specialty.deleteMany({ where: { id: { in: [...specialties] } } }); specialties.clear(); }
    if (services.size) { await prisma.service.deleteMany({ where: { id: { in: [...services] } } }); services.clear(); }
    if (clinics.size) { await prisma.clinic.deleteMany({ where: { id: { in: [...clinics] } } }); clinics.clear(); }
  });

  afterAll(async () => { await disposeReleaseAdminTestPrincipal(prisma, admin); await app.close(); });

  const headers = () => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });

  it('keeps CRUD clinic-scoped, canonicalizes names, and atomically replaces doctor specialties', async () => {
    const activeClinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const suffix = randomUUID().slice(0, 8);
    const specialty = await app.inject({ method: 'POST', url: '/v1/admin/specialties', headers: headers(), payload: { name: `  طب   داخلی ${suffix} `, isActive: true, publicationStatus: 'PUBLISHED' } });
    expect(specialty.statusCode).toBe(201);
    const specialtyBody = specialty.json(); specialties.add(specialtyBody.id);
    expect(specialtyBody.name).toBe(`طب داخلی ${suffix}`);

    const duplicate = await app.inject({ method: 'POST', url: '/v1/admin/specialties', headers: headers(), payload: { name: `طب داخلی ${suffix}` } });
    expect(duplicate.statusCode).toBe(409);

    const doctor = await app.inject({ method: 'POST', url: '/v1/admin/doctors', headers: headers(), payload: { displayName: `  دکتر   آزمون ${suffix} ` } });
    expect(doctor.statusCode).toBe(201);
    const doctorBody = doctor.json(); doctors.add(doctorBody.id);
    expect(doctorBody.displayName).toBe(`دکتر آزمون ${suffix}`);

    const publishedWithoutSpecialty = await app.inject({ method: 'PATCH', url: `/v1/admin/doctors/${doctorBody.id}`, headers: headers(), payload: { publicationStatus: 'PUBLISHED' } });
    expect(publishedWithoutSpecialty.statusCode).toBe(409);

    const updated = await app.inject({ method: 'PATCH', url: `/v1/admin/doctors/${doctorBody.id}`, headers: headers(), payload: { specialtyIds: [specialtyBody.id], publicationStatus: 'PUBLISHED', isActive: true } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ publicationStatus: 'PUBLISHED', isActive: true, specialties: [{ id: specialtyBody.id }] });

    const list = await app.inject({ method: 'GET', url: `/v1/admin/doctors?specialtyId=${specialtyBody.id}&page=1&pageSize=20`, headers: headers() });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ page: 1, pageSize: 20, total: 1 });

    const otherClinic = await prisma.clinic.create({ data: { name: `Other ${suffix}`, status: 'INACTIVE' } }); clinics.add(otherClinic.id);
    const otherService = await prisma.service.create({ data: { clinicId: otherClinic.id, name: `Other ${suffix}`, canonicalName: `other ${suffix}` } }); services.add(otherService.id);
    const foreign = await app.inject({ method: 'GET', url: `/v1/admin/services/${otherService.id}`, headers: headers() });
    expect(foreign.statusCode).toBe(404);
    expect((await prisma.doctorProfile.findUniqueOrThrow({ where: { id: doctorBody.id } })).clinicId).toBe(activeClinic.id);
  });

  it('rejects empty patches and preserves dependency-safe deletion', async () => {
    const suffix = randomUUID().slice(0, 8);
    const specialty = await app.inject({ method: 'POST', url: '/v1/admin/specialties', headers: headers(), payload: { name: `پوست ${suffix}` } });
    const specialtyBody = specialty.json(); specialties.add(specialtyBody.id);
    const doctor = await app.inject({ method: 'POST', url: '/v1/admin/doctors', headers: headers(), payload: { displayName: `دکتر ${suffix}`, specialtyIds: [specialtyBody.id] } });
    const doctorBody = doctor.json(); doctors.add(doctorBody.id);
    const empty = await app.inject({ method: 'PATCH', url: `/v1/admin/doctors/${doctorBody.id}`, headers: headers(), payload: {} });
    expect(empty.statusCode).toBe(422);
    const inUse = await app.inject({ method: 'DELETE', url: `/v1/admin/specialties/${specialtyBody.id}`, headers: headers() });
    expect(inUse.statusCode).toBe(409);
    const deleteDoctor = await app.inject({ method: 'DELETE', url: `/v1/admin/doctors/${doctorBody.id}`, headers: headers() });
    expect(deleteDoctor.statusCode).toBe(409);
  });
});

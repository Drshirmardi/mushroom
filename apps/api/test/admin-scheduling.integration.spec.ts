import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AdminSchedulingService } from '../src/modules/scheduling/admin-scheduling.service';

describe('admin scheduling CRUD (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let scheduling: AdminSchedulingService; let token: string;
  const doctors = new Set<string>(); const rules = new Set<string>(); const closures = new Set<string>(); const exceptions = new Set<string>();
  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); scheduling = app.get(AdminSchedulingService); token = await app.get(AccessTokenService).issue({ userId: randomUUID(), sessionId: randomUUID(), roles: ['ADMIN'] }); }, 30_000);
  afterEach(async () => { if (exceptions.size) await prisma.doctorAvailabilityException.deleteMany({ where: { id: { in: [...exceptions] } } }); if (rules.size) await prisma.availabilityRule.deleteMany({ where: { id: { in: [...rules] } } }); if (closures.size) await prisma.clinicClosure.deleteMany({ where: { id: { in: [...closures] } } }); if (doctors.size) await prisma.doctorProfile.deleteMany({ where: { id: { in: [...doctors] } } }); doctors.clear(); rules.clear(); closures.clear(); exceptions.clear(); });
  afterAll(async () => { await app.close(); });
  const headers = () => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });
  const createDoctor = async () => { const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } }); const doctor = await prisma.doctorProfile.create({ data: { clinicId: clinic.id, displayName: `Schedule ${randomUUID().slice(0, 8)}` } }); doctors.add(doctor.id); return doctor; };

  it('manages recurring rules with deterministic order and rejects active overlaps', async () => {
    const doctor = await createDoctor();
    const first = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'IN_PERSON', isoWeekday: 1, startLocalTime: '09:00', endLocalTime: '12:00' } });
    expect(first.statusCode).toBe(201); rules.add(first.json().id); expect(first.json()).toMatchObject({ startLocalTime: '09:00', endLocalTime: '12:00', isActive: true });
    const adjacent = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'IN_PERSON', isoWeekday: 1, startLocalTime: '12:00', endLocalTime: '14:00' } });
    expect(adjacent.statusCode).toBe(201); rules.add(adjacent.json().id);
    const conflicting = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'IN_PERSON', isoWeekday: 1, startLocalTime: '11:00', endLocalTime: '13:00' } });
    expect(conflicting.statusCode).toBe(409); expect(conflicting.json().code).toBe('AVAILABILITY_INTERVAL_OVERLAP');
    const list = await app.inject({ method: 'GET', url: `/v1/admin/availability-rules?doctorId=${doctor.id}`, headers: headers() });
    expect(list.statusCode).toBe(200); expect(list.json().items.map((item: { startLocalTime: string }) => item.startLocalTime)).toEqual(['09:00', '12:00']);
    const patched = await app.inject({ method: 'PATCH', url: `/v1/admin/availability-rules/${first.json().id}`, headers: headers(), payload: { isActive: false } });
    expect(patched.statusCode).toBe(200); expect(patched.json().isActive).toBe(false);
    const deleted = await app.inject({ method: 'DELETE', url: `/v1/admin/availability-rules/${adjacent.json().id}`, headers: headers() });
    expect(deleted.statusCode).toBe(204); rules.delete(adjacent.json().id);
  });

  it('normalizes offset-aware closures and validates closure conflicts', async () => {
    const closure = await app.inject({ method: 'POST', url: '/v1/admin/clinic-closures', headers: headers(), payload: { startsAt: '2026-09-10T09:00:00+03:30', endsAt: '2026-09-10T10:00:00+03:30', label: '  Maintenance  ' } });
    expect(closure.statusCode).toBe(201); closures.add(closure.json().id); expect(closure.json()).toMatchObject({ startsAt: '2026-09-10T05:30:00.000Z', endsAt: '2026-09-10T06:30:00.000Z', label: 'Maintenance' });
    const conflict = await app.inject({ method: 'POST', url: '/v1/admin/clinic-closures', headers: headers(), payload: { startsAt: '2026-09-10T06:00:00Z', endsAt: '2026-09-10T07:00:00Z', label: 'Conflict' } });
    expect(conflict.statusCode).toBe(409); expect(conflict.json().code).toBe('AVAILABILITY_INTERVAL_OVERLAP');
    const invalid = await app.inject({ method: 'POST', url: '/v1/admin/clinic-closures', headers: headers(), payload: { startsAt: '2026-09-10T09:00:00', endsAt: '2026-09-10T10:00:00', label: 'No offset' } });
    expect(invalid.statusCode).toBe(422); expect(invalid.json().code).toBe('SCHEDULE_INTERVAL_INVALID');
    const patched = await app.inject({ method: 'PATCH', url: `/v1/admin/clinic-closures/${closure.json().id}`, headers: headers(), payload: { label: ' Updated maintenance ' } });
    expect(patched.statusCode).toBe(200); expect(patched.json().label).toBe('Updated maintenance');
    const deleted = await app.inject({ method: 'DELETE', url: `/v1/admin/clinic-closures/${closure.json().id}`, headers: headers() });
    expect(deleted.statusCode).toBe(204); closures.delete(closure.json().id);
  });

  it('enforces exception mode and same-kind effective-mode overlap rules', async () => {
    const doctor = await createDoctor();
    const invalid = await app.inject({ method: 'POST', url: '/v1/admin/doctor-availability-exceptions', headers: headers(), payload: { doctorId: doctor.id, kind: 'AVAILABLE', startsAt: '2026-09-11T09:00:00Z', endsAt: '2026-09-11T10:00:00Z' } });
    expect(invalid.statusCode).toBe(422); expect(invalid.json().code).toBe('SCHEDULE_INTERVAL_INVALID');
    const unavailable = await app.inject({ method: 'POST', url: '/v1/admin/doctor-availability-exceptions', headers: headers(), payload: { doctorId: doctor.id, kind: 'UNAVAILABLE', startsAt: '2026-09-11T09:00:00Z', endsAt: '2026-09-11T10:00:00Z' } });
    expect(unavailable.statusCode).toBe(201); exceptions.add(unavailable.json().id); expect(unavailable.json().visitMode).toBeNull();
    const overlap = await app.inject({ method: 'POST', url: '/v1/admin/doctor-availability-exceptions', headers: headers(), payload: { doctorId: doctor.id, kind: 'UNAVAILABLE', visitMode: 'ONLINE', startsAt: '2026-09-11T09:30:00Z', endsAt: '2026-09-11T10:30:00Z' } });
    expect(overlap.statusCode).toBe(409); expect(overlap.json().code).toBe('AVAILABILITY_INTERVAL_OVERLAP');
    const available = await app.inject({ method: 'POST', url: '/v1/admin/doctor-availability-exceptions', headers: headers(), payload: { doctorId: doctor.id, kind: 'AVAILABLE', visitMode: 'ONLINE', startsAt: '2026-09-11T09:30:00Z', endsAt: '2026-09-11T10:30:00Z', label: 'Extra clinic' } });
    expect(available.statusCode).toBe(201); exceptions.add(available.json().id);
    const patched = await app.inject({ method: 'PATCH', url: `/v1/admin/doctor-availability-exceptions/${available.json().id}`, headers: headers(), payload: { label: ' Updated extra clinic ' } });
    expect(patched.statusCode).toBe(200); expect(patched.json().label).toBe('Updated extra clinic');
    const deleted = await app.inject({ method: 'DELETE', url: `/v1/admin/doctor-availability-exceptions/${available.json().id}`, headers: headers() });
    expect(deleted.statusCode).toBe(204); exceptions.delete(available.json().id);
  });

  it('maps PostgreSQL exclusion-constraint races to the stable overlap code', async () => {
    const doctor = await createDoctor();
    const existing = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'ONLINE', isoWeekday: 2, startLocalTime: '09:00', endLocalTime: '10:00' } });
    expect(existing.statusCode).toBe(201); rules.add(existing.json().id);
    const internal = scheduling as unknown as { assertRuleFree: (...args: unknown[]) => Promise<void> };
    const original = internal.assertRuleFree;
    internal.assertRuleFree = async () => undefined;
    try {
      const databaseConflict = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'ONLINE', isoWeekday: 2, startLocalTime: '09:30', endLocalTime: '10:30' } });
      expect(databaseConflict.statusCode).toBe(409);
      expect(databaseConflict.json().code).toBe('AVAILABILITY_INTERVAL_OVERLAP');
    } finally { internal.assertRuleFree = original; }
  });
});

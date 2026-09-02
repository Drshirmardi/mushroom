import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('Phase 04 directory and schedule audit events (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let token: string; let actorId: string; let sessionId: string;
  const doctorIds = new Set<string>(); const specialtyIds = new Set<string>(); const serviceIds = new Set<string>(); const offeringIds = new Set<string>(); const ruleIds = new Set<string>(); const auditIds = new Set<string>();
  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); actorId = randomUUID(); sessionId = randomUUID(); await prisma.user.create({ data: { id: actorId, phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }); await prisma.session.create({ data: { id: sessionId, userId: actorId, refreshTokenHash: randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''), expiresAt: new Date(Date.now() + 86_400_000) } }); token = await app.get(AccessTokenService).issue({ userId: actorId, sessionId, roles: ['ADMIN'] }); }, 30_000);
  afterEach(async () => { if (auditIds.size) await prisma.auditEvent.deleteMany({ where: { id: { in: [...auditIds] } } }); if (ruleIds.size) await prisma.availabilityRule.deleteMany({ where: { id: { in: [...ruleIds] } } }); if (offeringIds.size) await prisma.doctorService.deleteMany({ where: { id: { in: [...offeringIds] } } }); if (doctorIds.size) await prisma.doctorSpecialty.deleteMany({ where: { doctorId: { in: [...doctorIds] } } }); if (doctorIds.size) await prisma.doctorProfile.deleteMany({ where: { id: { in: [...doctorIds] } } }); if (specialtyIds.size) await prisma.specialty.deleteMany({ where: { id: { in: [...specialtyIds] } } }); if (serviceIds.size) await prisma.service.deleteMany({ where: { id: { in: [...serviceIds] } } }); doctorIds.clear(); specialtyIds.clear(); serviceIds.clear(); offeringIds.clear(); ruleIds.clear(); auditIds.clear(); });
  afterAll(async () => { await prisma.user.deleteMany({ where: { id: actorId } }); await app.close(); });
  const headers = () => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });
  const audits = async () => { const rows = await prisma.auditEvent.findMany({ where: { actorUserId: actorId }, orderBy: { createdAt: 'asc' } }); rows.forEach((row) => auditIds.add(row.id)); return rows; };

  it('writes safe in-transaction rule audits and leaves no audit for a rejected overlap', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const doctor = await prisma.doctorProfile.create({ data: { clinicId: clinic.id, displayName: `Audit ${randomUUID().slice(0, 8)}` } }); doctorIds.add(doctor.id);
    const first = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'IN_PERSON', isoWeekday: 3, startLocalTime: '09:00', endLocalTime: '10:00' } });
    expect(first.statusCode).toBe(201); ruleIds.add(first.json().id);
    const created = await audits(); expect(created).toHaveLength(1); expect(created[0]).toMatchObject({ action: 'SCHEDULING_RULE_CREATED', actorUserId: actorId, subjectType: 'SCHEDULING_RULE', subjectId: first.json().id }); expect(created[0].metadata).toEqual({ changedFields: ['created'] });
    const rejected = await app.inject({ method: 'POST', url: '/v1/admin/availability-rules', headers: headers(), payload: { doctorId: doctor.id, visitMode: 'IN_PERSON', isoWeekday: 3, startLocalTime: '09:30', endLocalTime: '10:30' } });
    expect(rejected.statusCode).toBe(409); expect((await audits())).toHaveLength(1);
    const update = await app.inject({ method: 'PATCH', url: `/v1/admin/availability-rules/${first.json().id}`, headers: headers(), payload: { isActive: false } }); expect(update.statusCode).toBe(200);
    const updated = await audits(); expect(updated[1]).toMatchObject({ action: 'SCHEDULING_RULE_UPDATED', subjectId: first.json().id }); expect(updated[1].metadata).toEqual({ changedFields: ['isActive'], stateTransitions: [{ field: 'isActive', from: true, to: false }] });
  });

  it('does not copy closure labels to audit metadata', async () => {
    const created = await app.inject({ method: 'POST', url: '/v1/admin/clinic-closures', headers: headers(), payload: { startsAt: '2026-12-01T09:00:00Z', endsAt: '2026-12-01T10:00:00Z', label: 'Private closure detail' } });
    expect(created.statusCode).toBe(201);
    const events = await audits(); expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ action: 'SCHEDULING_CLOSURE_CREATED', subjectType: 'SCHEDULING_CLOSURE' }); expect(JSON.stringify(events[0].metadata)).not.toContain('Private closure detail');
    await prisma.clinicClosure.delete({ where: { id: created.json().id } });
  });

  it('records offering price and publication transitions without copying private doctor fields', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } }); const now = new Date(); const specialty = await prisma.specialty.create({ data: { clinicId: clinic.id, name: `Offer ${randomUUID().slice(0, 8)}`, canonicalName: randomUUID(), isActive: true, publicationStatus: 'PUBLISHED', publishedAt: now } }); specialtyIds.add(specialty.id);
    const doctor = await prisma.doctorProfile.create({ data: { clinicId: clinic.id, displayName: `Offer ${randomUUID().slice(0, 8)}`, biography: 'private biography', isActive: true } }); doctorIds.add(doctor.id); await prisma.doctorSpecialty.create({ data: { clinicId: clinic.id, doctorId: doctor.id, specialtyId: specialty.id } }); await prisma.doctorProfile.update({ where: { id: doctor.id }, data: { publicationStatus: 'PUBLISHED', publishedAt: now } });
    const service = await prisma.service.create({ data: { clinicId: clinic.id, name: `Offer ${randomUUID().slice(0, 8)}`, canonicalName: randomUUID(), isActive: true, publicationStatus: 'PUBLISHED', publishedAt: now } }); serviceIds.add(service.id);
    const offering = await prisma.doctorService.create({ data: { clinicId: clinic.id, doctorId: doctor.id, serviceId: service.id, visitMode: 'ONLINE', durationMinutes: 30, bufferMinutes: 0, priceAmount: 1000, currency: 'IRR' } }); offeringIds.add(offering.id);
    const response = await app.inject({ method: 'PATCH', url: `/v1/admin/doctor-services/${offering.id}`, headers: headers(), payload: { priceAmount: 1500, publicationStatus: 'PUBLISHED', isActive: true } });
    expect(response.statusCode).toBe(200);
    const [event] = await audits(); expect(event).toMatchObject({ action: 'DIRECTORY_DOCTOR_SERVICE_UPDATED', subjectType: 'DIRECTORY_DOCTOR_SERVICE', subjectId: offering.id }); expect(event.metadata).toMatchObject({ changedFields: expect.arrayContaining(['priceAmount', 'publicationStatus', 'isActive']), price: { from: { priceAmount: 1000, currency: 'IRR' }, to: { priceAmount: 1500, currency: 'IRR' } } }); expect(JSON.stringify(event.metadata)).not.toContain('private biography');
  });
});

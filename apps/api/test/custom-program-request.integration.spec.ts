import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { CustomProgramService } from '../src/modules/programs/custom-requests/custom-program.service';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('custom request/scoped care (disposable PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string, doctorRole: string, originalSign: boolean;
  let admin: Awaited<ReturnType<typeof actor>>, doctor: Awaited<ReturnType<typeof actor>>;
  beforeAll(async () => {
    assertPatientJourneyTestDatabase(); Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService); clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    doctorRole = (await db.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } })).id; originalSign = !!await db.clinicalRolePermission.count({ where: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }); await db.clinicalRolePermission.upsert({ where: { roleId_permission: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }, create: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' }, update: {} });
  }, 30_000);
  afterAll(async () => { try { if (db && !originalSign) await db.clinicalRolePermission.deleteMany({ where: { roleId: doctorRole, permission: 'CLINICAL_RECORD_SIGN' } }); } finally { vi.restoreAllMocks(); await app?.close(); } });
  beforeEach(async () => { admin = await actor('ADMIN'); doctor = await actor('DOCTOR'); });
  async function actor(role: 'ADMIN'|'DOCTOR'|'PATIENT', live = true) {
    const a = await createTestAccessToken(db, app.get(AccessTokenService), [role]); if (live) await db.userRole.create({ data: { userId: a.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (role !== 'PATIENT') await db.clinicalClinicAccess.create({ data: { userId: a.userId, clinicId } });
    const profile = role === 'PATIENT' ? await db.patientProfile.create({ data: { userId: a.userId, clinicId } }) : null;
    const d = role === 'DOCTOR' ? await db.doctorProfile.create({ data: { userId: a.userId, clinicId, displayName: 'Synthetic named professional', isActive: true } }) : null;
    if (d) { const name = randomUUID(), specialty = await db.specialty.create({ data: { clinicId, name, canonicalName: name, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); await db.doctorSpecialty.create({ data: { clinicId, doctorId: d.id, specialtyId: specialty.id } }); await db.doctorProfile.update({ where: { id: d.id }, data: { publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); }
    return { ...a, profile, doctorId: d?.id };
  }
  const req = (method: 'GET'|'POST', path: string, who = admin, payload?: object, key: string|null = randomUUID()) => app.inject({ method, url: `/v1/${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  async function policy(purpose = 'CUSTOM_PROGRAM_CARE', locale = 'fa-IR') {
    await db.consentPolicyVersion.updateMany({ where: { clinicId, policyKey: purpose, locale, status: 'ACTIVE' }, data: { status: 'RETIRED', retiredAt: new Date() } });
    const prior = await db.consentPolicyVersion.findFirst({ where: { clinicId, policyKey: purpose, locale }, orderBy: { versionNumber: 'desc' } }), body = `Synthetic legal fixture only ${randomUUID()}; no real approved legal text.`;
    return db.consentPolicyVersion.create({ data: { clinicId, policyKey: purpose, locale, versionNumber: (prior?.versionNumber ?? 0) + 1, title: 'Synthetic terms', body, contentHash: createHash('sha256').update(body).digest('hex'), status: 'ACTIVE', activatedAt: new Date() } });
  }
  const safety = { intendedAudience: 'Synthetic service audience', limitations: 'Synthetic only; no automatic diagnosis or therapy.', contraindications: [], seekProfessionalCare: 'Human review required.' };
  async function setup(care = true) {
    const name = randomUUID(), service = await db.service.create({ data: { clinicId, name, canonicalName: name, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }), ds = await db.doctorService.create({ data: { clinicId, doctorId: doctor.doctorId!, serviceId: service.id, visitMode: 'ONLINE', durationMinutes: 30, priceAmount: 100000, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
    const input = { programKey: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`, locale: 'fa-IR', kind: 'CUSTOM_PROFESSIONAL_PLAN', title: 'Synthetic professional service', summary: 'Reviewed service summary', category: 'Professional service', body: 'PRIVATE synthetic clinical preparation instruction.', eligibilityDescription: 'Professional review is required; no automatic suitability.', safety, contentReferences: [], doctorServiceId: ds.id };
    const d = await req('POST', 'admin/program-definitions/versions', admin, input); expect(d.statusCode, d.body).toBe(201); const definition = d.json();
    const approved = await req('POST', `clinical/program-definitions/${definition.id}/approve`, doctor, { contentHash: definition.contentHash, reviewedProgramAndSafety: true, noAutomaticTherapyActivation: true }); expect(approved.statusCode, approved.body).toBe(201);
    const terms = await policy('PROGRAM_PURCHASE_TERMS'), config = { programDefinitionId: definition.id, termsPolicyVersionId: terms.id, amountRial: '100000', currency: 'IRR', accessMode: 'ONE_DELIVERY', accessDurationDays: null, quoteTtlSeconds: 600, retentionPolicyRef: 'SYNTHETIC_TEST_ONLY' };
    const preview = await req('POST', 'admin/program-offerings/preview', admin, config); expect(preview.statusCode, preview.body).toBe(200);
    const published = await req('POST', 'admin/program-offerings', admin, { ...config, publicationHash: preview.json().publicationHash, expectedPublicationNumber: 0, reviewedTermsAndRetention: true }); expect(published.statusCode, published.body).toBe(201);
    if (!care) await db.consentPolicyVersion.updateMany({ where: { clinicId, policyKey: 'CUSTOM_PROGRAM_CARE', status: 'ACTIVE' }, data: { status: 'RETIRED', retiredAt: new Date() } });
    return { definition, input, terms, pub: published.json(), ds, care: care ? await policy() : null };
  }
  const selected = (f: Awaited<ReturnType<typeof setup>>) => ({ publicationId: f.pub.id, publicationHash: f.pub.publicationHash });
  const accepted = (f: Awaited<ReturnType<typeof setup>>, expectedVersionNumber = 0) => ({ policyVersionId: f.care!.id, contentHash: f.care!.contentHash, accepted: true, expectedVersionNumber });
  const base = 'patients/me/custom-program-requests';
  const carePath = (id: string) => `${base}/${id}/care-authorizations`;
  async function select(f: Awaited<ReturnType<typeof setup>>, p: Awaited<ReturnType<typeof actor>>, key = randomUUID()) { const r = await req('POST', base, p, selected(f), key); expect(r.statusCode, r.body).toBe(201); return r.json(); }
  async function accept(f: Awaited<ReturnType<typeof setup>>, p: Awaited<ReturnType<typeof actor>>, id: string, version = 0, key = randomUUID()) { const r = await req('POST', carePath(id), p, accepted(f, version), key); expect(r.statusCode, r.body).toBe(201); return r.json(); }
  it('discovers public named metadata; no intake/age/assessment prerequisite or private body/financial/clinical effects', async () => {
    const f = await setup(), p = await actor('PATIENT'), before = await Promise.all([db.billingIntent.count(), db.treatmentPlan.count(), db.programAccessGrant.count()]);
    const r = await req('GET', `patients/me/custom-program-offerings/${f.pub.id}`, p); expect(r.statusCode, r.body).toBe(200); expect(r.headers['cache-control']).toContain('no-store'); expect(r.json()).toMatchObject({ requestSupported: true, checkoutAvailable: false, clinicalDeliveryAvailable: false, amountRial: '100000', physician: { id: doctor.doctorId }, carePolicy: { id: f.care!.id }, blockers: ['CUSTOM_PROGRAM_REQUEST_REQUIRED'] }); expect(r.body).not.toContain(f.input.body);
    const s = await select(f, p); expect(s).toMatchObject({ sourceAvailable: true, careAuthorization: null }); expect(await Promise.all([db.billingIntent.count(), db.treatmentPlan.count(), db.programAccessGrant.count()])).toEqual(before);
    const list = await req('GET', 'patients/me/custom-program-offerings?pageSize=1', p); expect(list.statusCode).toBe(200); expect(list.json().items).toHaveLength(1);
  }, 15_000);
  it('missing released care policy is explicit and prevents new request without seeding text', async () => {
    const f = await setup(false), p = await actor('PATIENT'), r = await req('GET', `patients/me/custom-program-offerings/${f.pub.id}`, p); expect(r.json()).toMatchObject({ requestSupported: false, carePolicy: null }); expect(r.json().blockers).toContain('CUSTOM_PROGRAM_CARE_POLICY_UNAVAILABLE'); expect((await req('POST', base, p, selected(f))).statusCode).toBe(409);
  }, 15_000);
  it('same-key concurrent selection returns one canonical retained request after commercial retirement', async () => {
    const f = await setup(), p = await actor('PATIENT'), key = randomUUID(), rows = await Promise.all(Array.from({ length: 5 }, () => req('POST', base, p, selected(f), key))); expect(rows.map(r => r.statusCode)).toEqual(Array(5).fill(201)); const id = rows[0]!.json().id; expect(new Set(rows.map(r => r.json().id)).size).toBe(1); expect(await db.customProgramRequest.count({ where: { patientId: p.profile!.id } })).toBe(1);
    expect((await req('POST', `admin/program-offerings/${f.pub.id}/retire`)).statusCode).toBe(201); expect((await req('POST', base, p, selected(f), key)).json().id).toBe(id); expect((await req('POST', base, p, { ...selected(f), publicationHash: '0'.repeat(64) }, key)).statusCode).toBe(409); expect((await req('POST', base, p, selected(f))).statusCode).toBe(404);
  }, 20_000);
  it('request-specific acceptance shares generic evidence but never authorizes another request', async () => {
    const f = await setup(), p = await actor('PATIENT'), a = await select(f, p), b = await select(f, p), before = await db.treatmentPlan.count(), authorization = await accept(f, p, a.id);
    expect(authorization).toMatchObject({ versionNumber: 1, careAuthorized: true }); expect((await req('GET', `${base}/${b.id}`, p)).json().careAuthorization).toBeNull(); const second = await accept(f, p, b.id); expect(second.id).not.toBe(authorization.id);
    expect(await db.patientConsentRecord.count({ where: { patientId: p.profile!.id, policyVersionId: f.care!.id } })).toBe(1); expect(await db.treatmentPlan.count()).toBe(before);
    const w = await req('POST', `${carePath(a.id)}/${authorization.id}/withdrawal`, p); expect(w.statusCode, w.body).toBe(201); expect(w.json()).toMatchObject({ careAuthorized: false, withdrawalReason: 'PATIENT_WITHDRAWAL' }); expect((await req('GET', `${base}/${b.id}`, p)).json().careAuthorization.careAuthorized).toBe(true);
  }, 15_000);
  it('concurrent independent keys reuse one open authority; aliases replay current withdrawn state without revival', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p), keys = Array.from({ length: 5 }, () => randomUUID()), responses = await Promise.all(keys.map(k => req('POST', carePath(s.id), p, accepted(f), k))); expect(responses.map(r => r.statusCode)).toEqual(Array(5).fill(201)); const id = responses[0]!.json().id; expect(new Set(responses.map(r => r.json().id)).size).toBe(1);
    expect((await req('POST', `${carePath(s.id)}/${id}/withdrawal`, p)).statusCode).toBe(201); await db.consentPolicyVersion.update({ where: { id: f.care!.id }, data: { status: 'RETIRED', retiredAt: new Date() } }); for (const key of keys) expect((await req('POST', carePath(s.id), p, accepted(f), key)).json()).toMatchObject({ id, careAuthorized: false, withdrawalReason: 'PATIENT_WITHDRAWAL' }); expect(await db.customProgramCareAuthorization.count({ where: { requestId: s.id } })).toBe(1);
  }, 20_000);
  it('explicit renewal requires latest version and permanently retains earlier withdrawal', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id); await req('POST', `${carePath(s.id)}/${a.id}/withdrawal`, p);
    expect((await req('POST', carePath(s.id), p, accepted(f))).statusCode).toBe(409); const b = await accept(f, p, s.id, 1); expect(b).toMatchObject({ versionNumber: 2, careAuthorized: true }); const history = await req('GET', carePath(s.id), p); expect(history.json().total).toBe(2); expect(history.json().items.map((r: { careAuthorized: boolean }) => r.careAuthorized)).toEqual([true, false]); expect(Date.parse(b.acceptedAt)).toBeGreaterThanOrEqual(Date.parse(history.json().items[1].withdrawnAt));
  }, 15_000);
  it('new legal version suppresses old authority until explicit consecutive acceptance and supersedes atomically', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id); f.care = await policy(); expect((await req('GET', `${base}/${s.id}`, p)).json().careAuthorization.careAuthorized).toBe(false); expect((await req('POST', carePath(s.id), p, accepted(f))).statusCode).toBe(409); const b = await accept(f, p, s.id, 1); expect(b).toMatchObject({ versionNumber: 2, careAuthorized: true }); const old = await db.customProgramCareAuthorization.findUniqueOrThrow({ where: { id: a.id } }); expect(old.withdrawalReason).toBe('SUPERSEDED'); expect(old.withdrawnAt!.getTime()).toBeLessThanOrEqual(Date.parse(b.acceptedAt));
  }, 15_000);
  it('renewal preserves original selected service/price after sale retirement or directory repricing', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p); await req('POST', `admin/program-offerings/${f.pub.id}/retire`); await db.doctorService.update({ where: { id: f.ds.id }, data: { priceAmount: 999999 } }); const a = await accept(f, p, s.id); expect(a.careAuthorized).toBe(true); expect((await req('GET', `${base}/${s.id}`, p)).json()).toMatchObject({ amountRial: '100000', sourceAvailable: true, physician: { id: doctor.doctorId } });
  }, 15_000);
  it('named doctor/clinical source loss fails closed while privacy withdrawal still works', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id); await db.doctorProfile.update({ where: { id: doctor.doctorId! }, data: { isActive: false } }); const r = await req('GET', `${base}/${s.id}`, p); expect(r.json()).toMatchObject({ sourceAvailable: false, careAuthorization: { careAuthorized: false } }); expect((await req('POST', carePath(s.id), p, accepted(f, 1))).statusCode).toBe(409); expect((await req('POST', `${carePath(s.id)}/${a.id}/withdrawal`, p)).statusCode).toBe(201);
  }, 15_000);
  it('cross-patient request/history/consent/withdrawal and staff access are denied without disclosing source', async () => {
    const f = await setup(), p = await actor('PATIENT'), stranger = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id);
    for (const path of [`${base}/${s.id}`, carePath(s.id)]) { const r = await req('GET', path, stranger); expect(r.statusCode, r.body).toBe(404); expect(r.body).not.toContain(f.input.title); }
    expect((await req('POST', carePath(s.id), stranger, accepted(f))).statusCode).toBe(404); expect((await req('POST', `${carePath(s.id)}/${a.id}/withdrawal`, stranger)).statusCode).toBe(404);
    for (const staff of [admin, doctor]) expect((await req('GET', `${base}/${s.id}`, staff)).statusCode).toBe(403); expect((await req('GET', base, p)).json().total).toBe(1); expect((await req('GET', base, stranger)).json().total).toBe(0);
  }, 15_000);
  it('live actual patient role/session/account/clinic required even with a previously valid token', async () => {
    const f = await setup(), ghost = await actor('PATIENT', false); expect((await req('GET', base, ghost)).statusCode).toBe(403); const p = await actor('PATIENT'); await db.session.update({ where: { id: p.sessionId }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } }); expect((await req('POST', base, p, selected(f))).statusCode).toBe(401); expect((await app.inject({ method: 'GET', url: '/v1/' + base })).statusCode).toBe(401);
    const real = await actor('PATIENT'), other = await actor('PATIENT'), service = app.get(CustomProgramService); await expect(service.list({ page: 1, pageSize: 20 }, { actorUserId: real.userId, actorSessionId: other.sessionId, requestId: randomUUID(), ipAddress: '127.0.0.1' })).rejects.toThrow();
  }, 15_000);
  it('strict DTO/key/hash/version/page guards reject client authority overrides', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p); for (const field of ['clinicId','patientId','doctorId','amountRial']) expect((await req('POST', base, p, { ...selected(f), [field]: randomUUID() })).statusCode).toBe(400);
    expect((await req('POST', base, p, selected(f), null)).statusCode).toBe(422); expect((await req('POST', base, p, { ...selected(f), publicationHash: '0'.repeat(64) })).statusCode).toBe(409);
    for (const patch of [{ accepted: false }, { expectedVersionNumber: -1 }, { expectedVersionNumber: '0' }, { contentHash: 'x' }, { patientId: p.profile!.id }]) expect((await req('POST', carePath(s.id), p, { ...accepted(f), ...patch })).statusCode).toBe(400);
    for (const patch of [{ policyVersionId: f.terms.id, contentHash: f.terms.contentHash }, { contentHash: '0'.repeat(64) }]) expect((await req('POST', carePath(s.id), p, { ...accepted(f), ...patch })).statusCode).toBe(409);
    for (const query of ['pageSize=51','page=10001','patientId='+p.profile!.id]) expect((await req('GET', base+'?'+query, p)).statusCode).toBe(400);
  }, 15_000);
  it('withdrawal retries remain final and alias fingerprint conflicts return stable 409', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id), key = randomUUID(), path = `${carePath(s.id)}/${a.id}/withdrawal`;
    const rows = await Promise.all(Array.from({ length: 5 }, () => req('POST', path, p, undefined, key))); expect(rows.map(r => r.statusCode)).toEqual(Array(5).fill(201)); expect(new Set(rows.map(r => r.json().withdrawnAt)).size).toBe(1); const b = await select(f, p), other = await accept(f, p, b.id); expect((await req('POST', `${carePath(b.id)}/${other.id}/withdrawal`, p, undefined, key)).statusCode).toBe(409);
  }, 20_000);
  it('SQL retains request/consent/authority history and rejects foreign ownership/session/version/reactivation', async () => {
    const f = await setup(), p = await actor('PATIENT'), stranger = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id), row = await db.customProgramCareAuthorization.findUniqueOrThrow({ where: { id: a.id } });
    for (const op of [() => db.customProgramRequest.delete({ where: { id: s.id } }), () => db.customProgramRequest.update({ where: { id: s.id }, data: { doctorId: randomUUID() } }), () => db.customProgramCareAuthorization.delete({ where: { id: a.id } }), () => db.customProgramCareAuthorization.update({ where: { id: a.id }, data: { careConsentRecordId: randomUUID() } }), () => db.patientConsentRecord.update({ where: { id: row.careConsentRecordId }, data: { withdrawnAt: new Date() } }), () => db.patientConsentRecord.delete({ where: { id: row.careConsentRecordId } })]) await expect(op()).rejects.toThrow();
    await expect(db.customProgramCareAuthorization.update({ where: { id: a.id }, data: { withdrawnAt: new Date(), withdrawnByUserId: stranger.userId, withdrawnSessionId: stranger.sessionId, withdrawalReason: 'PATIENT_WITHDRAWAL', withdrawalIdempotencyKey: randomUUID() } })).rejects.toThrow();
    await req('POST', `${carePath(s.id)}/${a.id}/withdrawal`, p); await expect(db.customProgramCareAuthorization.update({ where: { id: a.id }, data: { withdrawnAt: null, withdrawnByUserId: null, withdrawnSessionId: null, withdrawalReason: null, withdrawalIdempotencyKey: null } })).rejects.toThrow();
    const original = await db.customProgramRequest.findUniqueOrThrow({ where: { id: s.id } }); for (const patch of [{ patientId: stranger.profile!.id }, { createdSessionId: stranger.sessionId }, { publicationHash: '0'.repeat(64) }, { doctorId: randomUUID() }]) await expect(db.customProgramRequest.create({ data: { ...original, id: randomUUID(), idempotencyKey: randomUUID(), createdAt: (await db.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now, ...patch } })).rejects.toThrow();
  }, 20_000);
  it('SQL rejects forged consecutive authority without relying on the one-open uniqueness constraint', async () => {
    const f = await setup(), p = await actor('PATIENT'), stranger = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id); await req('POST', `${carePath(s.id)}/${a.id}/withdrawal`, p);
    const row = await db.customProgramCareAuthorization.findUniqueOrThrow({ where: { id: a.id } });
    const data = { ...row, id: randomUUID(), versionNumber: 2, idempotencyKey: randomUUID(), authorizationHash: createHash('sha256').update(`${s.id}:${row.careConsentRecordId}:2`).digest('hex'), acceptedAt: (await db.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now, withdrawnAt: null, withdrawnByUserId: null, withdrawnSessionId: null, withdrawalReason: null, withdrawalIdempotencyKey: null };
    await expect(db.customProgramCareAuthorization.create({ data: { ...data, acceptedSessionId: stranger.sessionId } })).rejects.toThrow('independent patient');
    await expect(db.customProgramCareAuthorization.create({ data: { ...data, patientId: stranger.profile!.id } })).rejects.toThrow('Exact owned custom request');
    for (const patch of [{ authorizationHash: '0'.repeat(64) }, { versionNumber: 4 }]) await expect(db.customProgramCareAuthorization.create({ data: { ...data, ...patch } })).rejects.toThrow('consecutive custom care');
    expect(await db.customProgramCareAuthorization.count({ where: { requestId: s.id } })).toBe(1);
  }, 15000);
  it('SQL cannot supersede without a replacement or accept malformed final withdrawal tuples', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p), a = await accept(f, p, s.id), now = (await db.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now;
    const fields = { withdrawnAt: now, withdrawnByUserId: p.userId, withdrawnSessionId: p.sessionId, withdrawalReason: 'SUPERSEDED', withdrawalIdempotencyKey: randomUUID() }; await expect(db.customProgramCareAuthorization.update({ where: { id: a.id }, data: fields })).rejects.toThrow('Supersession');
    await expect(db.customProgramCareAuthorization.update({ where: { id: a.id }, data: { ...fields, withdrawalReason: null } })).rejects.toThrow(); expect((await req('GET', `${base}/${s.id}`, p)).json().careAuthorization.careAuthorized).toBe(true);
  }, 15_000);
  it('audit failure withholds metadata and atomically rolls back request, generic consent and authority', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p); await db.$executeRawUnsafe(`CREATE FUNCTION custom_care_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'CUSTOM_PROGRAM_%' THEN RAISE EXCEPTION 'synthetic custom audit failure'; END IF; RETURN NEW; END $$`); await db.$executeRawUnsafe('CREATE TRIGGER custom_care_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION custom_care_test_audit_fail()');
    try { const r = await req('GET', `${base}/${s.id}`, p); expect(r.statusCode).toBe(500); expect(r.body).not.toContain(f.care!.body); expect((await req('POST', base, p, selected(f))).statusCode).toBe(500); expect(await db.customProgramRequest.count({ where: { patientId: p.profile!.id } })).toBe(1); expect((await req('POST', carePath(s.id), p, accepted(f))).statusCode).toBe(500); expect(await db.patientConsentRecord.count({ where: { patientId: p.profile!.id, policyVersionId: f.care!.id } })).toBe(0); expect(await db.customProgramCareAuthorization.count({ where: { requestId: s.id } })).toBe(0); }
    finally { await db.$executeRawUnsafe('DROP TRIGGER custom_care_test_audit_fail ON audit_events'); await db.$executeRawUnsafe('DROP FUNCTION custom_care_test_audit_fail()'); }
  }, 15_000);
  it('database timestamps remain accurate with application clock ninety seconds ahead', async () => {
    const f = await setup(), p = await actor('PATIENT'), before = (await db.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`))[0]!.now; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(before.getTime()+90000)); try { const s = await select(f, p), a = await accept(f, p, s.id), w = await req('POST', `${carePath(s.id)}/${a.id}/withdrawal`, p); expect(w.statusCode, w.body).toBe(201); expect(Date.parse(w.json().withdrawnAt)).toBeLessThan(before.getTime()+30000); expect(Date.parse(a.acceptedAt)).toBeGreaterThanOrEqual(Date.parse(s.createdAt)); } finally { vi.useRealTimers(); }
  }, 15_000);
  it('patient/session/source changes committed while selection waits are rechecked under the shared publication lock', async () => {
    const f = await setup(), p = await actor('PATIENT'); let ready!: () => void, release!: () => void, pid = 0;
    const locked = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const holding = db.$transaction(async tx => { pid = (await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT pg_backend_pid() AS id`))[0]!.id; await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'program-publication:'+clinicId+':'+f.definition.programKey+':fa-IR'},0))::text`); ready(); await gate; }, { timeout: 15000 });
    await locked; const pending = req('POST', base, p, selected(f));
    try { let blocked = false; for (let n = 0; n < 50 && !blocked; n++) { blocked = !!(await db.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted AND ${pid}=ANY(pg_blocking_pids(pid))`))[0]?.n; if (!blocked) await new Promise(r => setTimeout(r, 20)); } expect(blocked).toBe(true); await db.doctorProfile.update({ where: { id: doctor.doctorId! }, data: { isActive: false } }); }
    finally { release(); await holding; }
    const response = await pending; expect(response.statusCode, response.body).toBe(404); expect(await db.customProgramRequest.count({ where: { patientId: p.profile!.id } })).toBe(0);
  }, 20000);
  it('care policy change committed while acceptance waits requires a fresh explicit legal acceptance', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p); let ready!: () => void, release!: () => void, pid = 0;
    const locked = new Promise<void>(r => { ready = r; }), gate = new Promise<void>(r => { release = r; });
    const holding = db.$transaction(async tx => { pid = (await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT pg_backend_pid() AS id`))[0]!.id; await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'custom-program-request:'+s.id},0))::text`); ready(); await gate; }, { timeout: 15000 });
    await locked; const pending = req('POST', carePath(s.id), p, accepted(f));
    try { let blocked = false; for (let n = 0; n < 50 && !blocked; n++) { blocked = !!(await db.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted AND ${pid}=ANY(pg_blocking_pids(pid))`))[0]?.n; if (!blocked) await new Promise(r => setTimeout(r, 20)); } expect(blocked).toBe(true); await policy(); }
    finally { release(); await holding; }
    const response = await pending; expect(response.statusCode, response.body).toBe(409); expect(await db.customProgramCareAuthorization.count({ where: { requestId: s.id } })).toBe(0); expect(await db.patientConsentRecord.count({ where: { patientId: p.profile!.id, policyVersionId: f.care!.id } })).toBe(0);
  }, 20000);
  it('custom selection and scoped care cannot activate existing ready-education checkout', async () => {
    const f = await setup(), p = await actor('PATIENT'), s = await select(f, p); await accept(f, p, s.id); const consent = await req('POST', 'patients/me/program-consents', p, { policyVersionId: f.terms.id, contentHash: f.terms.contentHash, accepted: true }); expect(consent.statusCode).toBe(201); const r = await req('POST', 'patients/me/billing/program-intents', p, { ...selected(f), termsConsentRecordId: consent.json().id }); expect(r.statusCode, r.body).toBe(404); expect(await db.programPurchase.count({ where: { patientId: p.profile!.id } })).toBe(0);
  }, 15_000);
});

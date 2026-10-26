import { createCompleteTestPatient } from './patient-entry-test-support';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('approved educational guidance (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string, articleId: string, doctorRoleId: string;
  let originalGrant = true;
  let admin: Awaited<ReturnType<typeof actor>>, doctor: Awaited<ReturnType<typeof actor>>, patient: Awaited<ReturnType<typeof actor>>;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    doctorRoleId = (await db.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } })).id;
    originalGrant = !!await db.clinicalRolePermission.findUnique({ where: { roleId_permission: { roleId: doctorRoleId, permission: 'CLINICAL_RECORD_SIGN' } } });
    await grant(); admin = await actor('ADMIN'); doctor = await actor('DOCTOR'); patient = await actor('PATIENT');
    articleId = (await article()).id;
  }, 30_000);
  afterAll(async () => { if (db && !originalGrant) await db.clinicalRolePermission.deleteMany({ where: { roleId: doctorRoleId, permission: 'CLINICAL_RECORD_SIGN' } }); await app?.close(); });
  async function grant() { await db.clinicalRolePermission.upsert({ where: { roleId_permission: { roleId: doctorRoleId, permission: 'CLINICAL_RECORD_SIGN' } }, create: { roleId: doctorRoleId, permission: 'CLINICAL_RECORD_SIGN' }, update: {} }); }
  async function actor(role: 'ADMIN' | 'DOCTOR' | 'PATIENT', membership = true, profile = true, liveRole = true) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    if (liveRole) await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (membership && role !== 'PATIENT') await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    if (role === 'PATIENT' && profile) await createCompleteTestPatient(db, { data: { userId: auth.userId, clinicId } });
    if (role === 'DOCTOR' && profile) {
      const suffix = randomUUID();
      const specialty = await db.specialty.create({ data: { clinicId, name: `Synthetic ${suffix}`, canonicalName: `synthetic ${suffix}`, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
      const reviewer = await db.doctorProfile.create({ data: { userId: auth.userId, clinicId, displayName: 'Synthetic reviewer', isActive: true } });
      await db.doctorSpecialty.create({ data: { clinicId, doctorId: reviewer.id, specialtyId: specialty.id } });
      await db.doctorProfile.update({ where: { id: reviewer.id }, data: { publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
    }
    return auth;
  }
  async function article(scope = clinicId) {
    const category = await db.articleCategory.create({ data: { clinicId: scope, slug: `synthetic-${randomUUID()}`, name: 'Synthetic guidance source' } });
    return db.article.create({ data: { clinicId: scope, categoryId: category.id, slug: `synthetic-${randomUUID()}`, title: 'Synthetic educational source', summary: 'Test fixture only', body: 'Synthetic text. Not clinical advice.' } });
  }
  const body = (source = articleId) => ({ articleId: source, locale: 'fa-IR', kind: 'GENERAL_EDUCATION', provenance: [{ label: 'Synthetic source only', url: 'https://example.org/synthetic', accessedOn: '2026-10-16' }], safety: { intendedAudience: 'Synthetic adults', limitations: 'Education only, not diagnosis', contraindications: [], seekProfessionalCare: 'Consult a qualified professional for individual decisions.' } });
  const req = (method: 'GET' | 'POST', url: string, who = admin, payload?: object, key: string | null = randomUUID()) => app.inject({ method, url: `/v1/${url}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  async function create(source = articleId) { const r = await req('POST', 'admin/guidance-content/versions', admin, body(source)); expect(r.statusCode).toBe(201); return r.json() as { id: string; contentHash: string; title: string; body: string; versionNumber: number }; }
  const approval = (row: { contentHash: string }) => ({ contentHash: row.contentHash, educationalOnly: true, noDiagnosisOrTherapeuticDiet: true });
  const approve = (row: { id: string; contentHash: string }, who = doctor) => req('POST', `clinical/guidance-content/${row.id}/approve`, who, approval(row));
  const read = (id: string) => req('GET', `patients/me/guidance-content/${id}`, patient);

  it('captures an immutable unapproved source snapshot without publishing or inventing advice', async () => {
    const row = await create(); const stored = await db.guidanceContentVersion.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored.status).toBe('DRAFT'); expect(stored.approvedByUserId).toBeNull(); expect(stored.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await read(row.id)).statusCode).toBe(404); expect((await db.article.findUniqueOrThrow({ where: { id: articleId } })).publicationStatus).toBe('DRAFT');
  });
  it('canonical concurrent retries create exactly one version; changed command conflicts', async () => {
    const payload = body(); const key = randomUUID();
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => req('POST', 'admin/guidance-content/versions', admin, i % 2 ? payload : Object.fromEntries(Object.entries(payload).reverse()), key)));
    expect(rs.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r => r.json().id)).size).toBe(1);
    const id = rs[0].json().id; expect(await db.auditEvent.count({ where: { subjectId: id, action: 'GUIDANCE_CONTENT_CREATED' } })).toBe(1);
    const changed = await req('POST', 'admin/guidance-content/versions', admin, { ...payload, locale: 'en-US' }, key); expect(changed.statusCode).toBe(409); expect(changed.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  it('serializes distinct authoring commands into consecutive versions', async () => {
    const source = await article(); const rs = await Promise.all(Array.from({ length: 8 }, () => req('POST', 'admin/guidance-content/versions', admin, body(source.id))));
    expect(rs.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(rs.map(r => r.json().versionNumber).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('rejects malformed/unsafe metadata and undeclared authority/text fields', async () => {
    for (const patch of [{ provenance: [] }, { provenance: [{ ...body().provenance[0], accessedOn: '2026-02-30' }] }, { provenance: [{ ...body().provenance[0], accessedOn: '2026-99-99' }] }, { provenance: [{ ...body().provenance[0], url: 'http://example.org' }] }, { safety: { ...body().safety, limitations: ' ' } }, { body: 'Client supplied override' }, { status: 'APPROVED' }, { kind: 'DIAGNOSIS' }, { locale: 'bad-locale-with-overly-long-subtag' }]) {
      const r = await req('POST', 'admin/guidance-content/versions', admin, { ...body(), ...patch }); expect([400, 422]).toContain(r.statusCode);
    }
    expect((await req('POST', 'admin/guidance-content/versions', admin, body(), null)).statusCode).toBe(422);
  });
  it('enforces admin live role and clinic membership; patient/doctor cannot author', async () => {
    for (const who of [patient, doctor, await actor('ADMIN', false), await actor('ADMIN', true, true, false)]) {
      for (const [method, path, payload] of [['GET', 'admin/guidance-content', undefined], ['POST', 'admin/guidance-content/versions', body()]] as const) expect((await req(method, path, who, payload)).statusCode).toBe(403);
    }
    expect((await app.inject({ method: 'GET', url: '/v1/admin/guidance-content' })).statusCode).toBe(401);
  });
  it('requires linked active published doctor, membership and live DOCTOR role; ADMIN cannot approve', async () => {
    const row = await create();
    for (const who of [admin, patient, await actor('DOCTOR', false), await actor('DOCTOR', true, false), await actor('DOCTOR', true, true, false)]) {
      expect((await approve(row, who)).statusCode).toBe(403); expect((await req('GET', `clinical/guidance-content/${row.id}`, who)).statusCode).toBe(403);
    }
    const inactive = await actor('DOCTOR'); await db.doctorProfile.update({ where: { userId: inactive.userId }, data: { isActive: false } }); expect((await approve(row, inactive)).statusCode).toBe(403);
    const unpublished = await actor('DOCTOR'); await db.doctorProfile.update({ where: { userId: unpublished.userId }, data: { publicationStatus: 'UNPUBLISHED', publishedAt: null } }); expect((await approve(row, unpublished)).statusCode).toBe(403);
  });
  it('requires current clinical-sign capability and conceals approved delivery after its removal', async () => {
    const row = await create(); expect((await approve(row)).statusCode).toBe(201);
    await db.clinicalRolePermission.delete({ where: { roleId_permission: { roleId: doctorRoleId, permission: 'CLINICAL_RECORD_SIGN' } } });
    try { expect((await approve(await create())).statusCode).toBe(403); expect((await read(row.id)).statusCode).toBe(404); } finally { await grant(); }
    expect((await read(row.id)).statusCode).toBe(200);
  });
  it('binds approval to exact hash and explicit educational/clinical safety attestations', async () => {
    const row = await create();
    expect((await req('POST', `clinical/guidance-content/${row.id}/approve`, doctor, { ...approval(row), contentHash: 'f'.repeat(64) })).statusCode).toBe(409);
    expect((await req('POST', `clinical/guidance-content/${row.id}/approve`, doctor, { ...approval(row), educationalOnly: false })).statusCode).toBe(400);
    expect((await req('POST', `clinical/guidance-content/${row.id}/approve`, doctor, { contentHash: row.contentHash })).statusCode).toBe(400);
    const rs = await Promise.all(Array.from({ length: 8 }, () => approve(row))); expect(rs.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r => r.json().approvedAt)).size).toBe(1);
    expect(await db.auditEvent.count({ where: { subjectId: row.id, action: 'GUIDANCE_CONTENT_APPROVED' } })).toBe(1);
    const r = await read(row.id); expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({ status: 'APPROVED', educationalOnly: true, contentHash: row.contentHash });
    for (const key of ['approvedByUserId', 'createdByUserId', 'approvedSessionId', 'approvedDoctorId', 'clinicId', 'idempotencyKey']) expect(r.json()).not.toHaveProperty(key);
    expect(r.headers['cache-control']).toBe('private, no-store');
  });
  it('source edits cannot mutate approved snapshot, inherit approval or break original command replay', async () => {
    const source = await article(); const payload = body(source.id); const key = randomUUID(); const r = await req('POST', 'admin/guidance-content/versions', admin, payload, key); const row = r.json(); await approve(row);
    await db.article.update({ where: { id: source.id }, data: { title: 'Later source title', body: 'Later synthetic text' } });
    const original = await read(row.id); expect(original.json().title).toBe(row.title); expect(original.json().body).toBe(row.body);
    const replay = await req('POST', 'admin/guidance-content/versions', admin, payload, key); expect(replay.json().id).toBe(row.id); expect(replay.json().contentHash).toBe(row.contentHash);
    const next = await create(source.id); expect(next.versionNumber).toBe(2); expect(next.contentHash).not.toBe(row.contentHash); expect((await read(next.id)).statusCode).toBe(404);
  });
  it('revocation is final/idempotent and ADMIN cannot revoke an approved version', async () => {
    const row = await create(); await approve(row); expect((await req('POST', `admin/guidance-content/${row.id}/revoke`)).statusCode).toBe(403);
    const rs = await Promise.all(Array.from({ length: 8 }, () => req('POST', `clinical/guidance-content/${row.id}/revoke`, doctor)));
    expect(rs.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r => r.json().revokedAt)).size).toBe(1);
    expect((await read(row.id)).statusCode).toBe(404); expect((await approve(row)).statusCode).toBe(409);
    expect(await db.auditEvent.count({ where: { subjectId: row.id, action: 'GUIDANCE_CONTENT_REVOKED' } })).toBe(1);
    const draft = await create(); expect((await req('POST', `admin/guidance-content/${draft.id}/revoke`)).statusCode).toBe(201); expect((await approve(draft)).statusCode).toBe(409);
  });
  it('serializes approval versus final withdrawal without resurrecting publication', async () => {
    const row = await create(); const rs = await Promise.all([approve(row), req('POST', `clinical/guidance-content/${row.id}/revoke`, doctor)]);
    expect([201, 409]).toContain(rs[0].statusCode); expect(rs[1].statusCode).toBe(201); expect((await db.guidanceContentVersion.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('REVOKED'); expect((await read(row.id)).statusCode).toBe(404);
  });
  it('conceals foreign clinic sources/versions and missing patient profile', async () => {
    const other = await db.clinic.create({ data: { name: 'Synthetic foreign guidance', status: 'INACTIVE' } }); const foreign = await article(other.id);
    expect((await req('POST', 'admin/guidance-content/versions', admin, body(foreign.id))).statusCode).toBe(404);
    const row = await create(); await approve(row);
    const outsider = await actor('PATIENT', true, false); await createCompleteTestPatient(db, { data: { userId: outsider.userId, clinicId: other.id } });
    expect((await req('GET', `patients/me/guidance-content/${row.id}`, outsider)).statusCode).toBe(404); expect((await req('GET', `patients/me/guidance-content/${row.id}`, await actor('PATIENT', true, false))).statusCode).toBe(404);
    expect((await req('GET', `clinical/guidance-content/${randomUUID()}`, doctor)).statusCode).toBe(404);
  });
  it('lists bounded deterministic versions with independent physician access', async () => {
    const source = await article(); await create(source.id); await create(source.id); await create(source.id);
    for (const [prefix, who] of [['admin', admin], ['clinical', doctor]] as const) {
      const r = await req('GET', `${prefix}/guidance-content?articleId=${source.id}&pageSize=2`, who); expect(r.statusCode).toBe(200); expect(r.json().items).toHaveLength(2); expect(r.json().total).toBe(3); expect(new Set(r.json().items.map((i: { id: string }) => i.id)).size).toBe(2);
      expect((await req('GET', `${prefix}/guidance-content?pageSize=51`, who)).statusCode).toBe(400);
    }
  });
  it('suppresses delivery when approving doctor is deactivated or loses clinic scope', async () => {
    const reviewer = await actor('DOCTOR'); const row = await create(); await approve(row, reviewer);
    await db.doctorProfile.update({ where: { userId: reviewer.userId }, data: { isActive: false } }); expect((await read(row.id)).statusCode).toBe(404);
    await db.doctorProfile.update({ where: { userId: reviewer.userId }, data: { isActive: true } }); expect((await read(row.id)).statusCode).toBe(200);
    await db.clinicalClinicAccess.delete({ where: { userId_clinicId: { userId: reviewer.userId, clinicId } } }); expect((await read(row.id)).statusCode).toBe(404);
  });
  it('database retains immutable text/evidence and rejects forged approval or version/scope gaps', async () => {
    const row = await create(); const stored = await db.guidanceContentVersion.findUniqueOrThrow({ where: { id: row.id } });
    await expect(db.guidanceContentVersion.update({ where: { id: row.id }, data: { body: 'Changed' } })).rejects.toThrow(/immutable/);
    await expect(db.guidanceContentVersion.delete({ where: { id: row.id } })).rejects.toThrow(/retained/);
    await expect(db.guidanceContentVersion.update({ where: { id: row.id }, data: { status: 'APPROVED', approvedByUserId: admin.userId, approvedDoctorId: (await db.doctorProfile.findUniqueOrThrow({ where: { userId: doctor.userId } })).id, approvedSessionId: admin.sessionId, approvedAt: new Date(Date.now() + 1000) } })).rejects.toThrow(/Qualified/);
    await expect(db.guidanceContentVersion.update({ where: { id: row.id }, data: { status: 'APPROVED', approvedByUserId: doctor.userId, approvedDoctorId: (await db.doctorProfile.findUniqueOrThrow({ where: { userId: doctor.userId } })).id, approvedSessionId: admin.sessionId, approvedAt: new Date(Date.now() + 1000) } })).rejects.toThrow(/owned approval session/);
    await expect(db.guidanceContentVersion.create({ data: { ...stored, provenance: stored.provenance!, safety: stored.safety!, id: randomUUID(), versionNumber: stored.versionNumber + 10, idempotencyKey: randomUUID() } })).rejects.toThrow(/consecutive/);
    await approve(row); await expect(db.guidanceContentVersion.update({ where: { id: row.id }, data: { approvedSessionId: admin.sessionId } })).rejects.toThrow(/immutable/);
    await req('POST', `clinical/guidance-content/${row.id}/revoke`, doctor); await expect(db.guidanceContentVersion.update({ where: { id: row.id }, data: { status: 'APPROVED', revokedAt: null, revokedByUserId: null, revokedSessionId: null } })).rejects.toThrow(/final/);
  });
  it('keeps approval/revocation evidence monotonic despite a backwards clock step', async () => {
    const row = await create(); const stored = await db.guidanceContentVersion.findUniqueOrThrow({ where: { id: row.id } });
    const future = await db.guidanceContentVersion.create({ data: { ...stored, id: randomUUID(), versionNumber: stored.versionNumber + 1, idempotencyKey: randomUUID(), provenance: stored.provenance!, safety: stored.safety!, createdAt: new Date(Date.now() + 60_000) } });
    const approved = await approve(future); expect(approved.statusCode).toBe(201); expect(new Date(approved.json().approvedAt).getTime()).toBeGreaterThanOrEqual(future.createdAt.getTime());
    const revoked = await req('POST', `clinical/guidance-content/${future.id}/revoke`, doctor); expect(revoked.statusCode).toBe(201); expect(new Date(revoked.json().revokedAt).getTime()).toBeGreaterThanOrEqual(new Date(approved.json().approvedAt).getTime());
  });
  it('atomic audit failures roll back draft creation, approval and revocation and deny reads', async () => {
    const failedAdmin = await actor('ADMIN'), failedDoctor = await actor('DOCTOR'), failedPatient = await actor('PATIENT'); const draft = await create(); const approved = await create(); await approve(approved);
    for (const who of [failedAdmin, failedDoctor, failedPatient]) if (!/^[a-f0-9-]{36}$/.test(who.userId)) throw new Error('Invalid fixture UUID');
    const ids = [failedAdmin, failedDoctor, failedPatient].map(w => `'${w.userId}'::uuid`).join(',');
    await db.$executeRawUnsafe(`CREATE FUNCTION guidance_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id IN (${ids}) THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER guidance_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION guidance_test_audit_fail()`);
    const source = await article();
    try {
      const cases = [['POST', 'admin/guidance-content/versions', failedAdmin, body(source.id)], ['POST', `clinical/guidance-content/${draft.id}/approve`, failedDoctor, approval(draft)], ['POST', `clinical/guidance-content/${approved.id}/revoke`, failedDoctor, undefined], ['GET', `clinical/guidance-content/${draft.id}`, failedDoctor, undefined], ['GET', 'admin/guidance-content', failedAdmin, undefined], ['GET', `patients/me/guidance-content/${approved.id}`, failedPatient, undefined]] as const;
      for (const [method, path, who, payload] of cases) { const r = await req(method, path, who, payload); expect(r.statusCode).toBe(500); expect(r.body).not.toContain('synthetic audit failure'); }
      expect(await db.guidanceContentVersion.count({ where: { articleId: source.id } })).toBe(0); expect((await db.guidanceContentVersion.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('DRAFT'); expect((await db.guidanceContentVersion.findUniqueOrThrow({ where: { id: approved.id } })).status).toBe('APPROVED');
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER guidance_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION guidance_test_audit_fail()`); }
  });
  it('rejects revoked sessions and leaves audit metadata free of source text and safety content', async () => {
    const who = await actor('DOCTOR'); await db.session.update({ where: { id: who.sessionId }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } }); expect((await req('GET', 'clinical/guidance-content', who)).statusCode).toBe(401);
    const row = await create(); await approve(row); await read(row.id);
    const events = await db.auditEvent.findMany({ where: { subjectId: row.id } }); expect(events.length).toBeGreaterThan(2); expect(events.every(e => JSON.stringify(e.metadata) === '{}')).toBe(true);
  });
});

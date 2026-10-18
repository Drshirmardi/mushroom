import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment authoring (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication; let db: PrismaService;
  let admin: Awaited<ReturnType<typeof createTestAccessToken>>;
  const structure = { schemaVersion: 1, sections: [{ id: 's', title: 'Synthetic', order: 1, questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 2, falseScore: 0 }] }], resultBands: [{ id: 'only', title: 'Synthetic result', minInclusive: 0 }] };
  const body = () => ({ assessmentKey: `TEST_${randomUUID().replaceAll('-', '').toUpperCase()}`, locale: 'en-US', title: 'Synthetic authoring', structure });
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || !['/patient_journey_test', '/patient_journey_mizaj_preview_test'].includes(target.pathname)) throw new Error('Explicit disposable authoring test database on localhost:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    admin = await createTestAccessToken(db, app.get(AccessTokenService), ['ADMIN']);
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  const request = (method: 'GET' | 'POST' | 'PATCH', path = '', payload?: object, who = admin) => app.inject({ method, url: `/v1/admin/assessments${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  async function create() { const response = await request('POST', '', body()); expect(response.statusCode).toBe(201); return response.json() as { id: string; assessmentKey: string }; }
  async function failAudit<T>(who: typeof admin, run: () => Promise<T>) {
    if (!/^[a-f0-9-]{36}$/.test(who.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION authoring_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id = '${who.userId}'::uuid THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER authoring_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION authoring_test_audit_fail()`);
    try { return await run(); } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER authoring_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION authoring_test_audit_fail()`); }
  }
  it('rejects structurally unscorable questions before creating a draft', async () => {
    const payload = body(); const invalid = { ...payload, structure: { schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'BOOLEAN', required: true }] }] } };
    const response = await request('POST', '', invalid); expect(response.statusCode).toBe(422); expect(response.json().code).toBe('ASSESSMENT_STRUCTURE_INVALID');
    expect(await db.assessmentVersion.count({ where: { assessmentKey: payload.assessmentKey } })).toBe(0);
  });
  it('allocates distinct consecutive versions for concurrent create commands', async () => {
    const payload = body(); const responses = await Promise.all(Array.from({ length: 8 }, () => request('POST', '', payload)));
    expect(responses.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(responses.map(r => r.json().versionNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('rolls back draft creation when its audit fails', async () => {
    const payload = body(); await failAudit(admin, async () => {
      expect((await request('POST', '', payload)).statusCode).toBe(500);
      expect(await db.assessmentVersion.count({ where: { assessmentKey: payload.assessmentKey } })).toBe(0);
    });
  });
  it('allocates distinct versions for concurrent duplicate commands', async () => {
    const source = await create(); const responses = await Promise.all(Array.from({ length: 8 }, () => request('POST', `/${source.id}/duplicate`)));
    expect(responses.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(responses.map(r => r.json().versionNumber).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('merges simultaneous title-only and structure-only updates against the locked draft', async () => {
    const item = await create(); const changed = { ...structure, sections: [{ ...structure.sections[0], questions: [{ ...structure.sections[0].questions[0], trueScore: 7 }] }] };
    const replies = await Promise.all([request('PATCH', `/${item.id}`, { title: 'Changed title' }), request('PATCH', `/${item.id}`, { structure: changed })]); expect(replies.map(r => r.statusCode)).toEqual([200, 200]);
    expect((await request('GET', `/${item.id}`)).json()).toMatchObject({ title: 'Changed title', structure: changed });
  });
  it('rolls back update, duplicate, publication and retirement when their audits fail', async () => {
    const draft = await create(); const published = await create(); expect((await request('POST', `/${published.id}/publish`)).statusCode).toBe(201);
    await failAudit(admin, async () => {
      for (const [method, path, payload] of [['PATCH', `/${draft.id}`, { title: 'Cannot persist' }], ['POST', `/${draft.id}/duplicate`, undefined], ['POST', `/${draft.id}/publish`, undefined], ['POST', `/${published.id}/archive`, undefined]] as const) expect((await request(method, path, payload)).statusCode).toBe(500);
      expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: draft.id } })).title).toBe('Synthetic authoring');
      expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('DRAFT');
      expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: published.id } })).status).toBe('PUBLISHED');
      expect(await db.assessmentVersion.count({ where: { assessmentKey: draft.assessmentKey } })).toBe(1);
    });
  });
  it('refuses publication of an empty legacy draft but keeps it editable', async () => {
    const payload = { ...body(), structure: { schemaVersion: 1, sections: [] } }; const created = await request('POST', '', payload); expect(created.statusCode).toBe(201);
    const id = created.json().id; expect((await request('POST', `/${id}/publish`)).statusCode).toBe(422);
    expect((await request('PATCH', `/${id}`, { structure })).statusCode).toBe(200); expect((await request('POST', `/${id}/publish`)).statusCode).toBe(201);
  });
  it('returns one publication and a stable conflict for two versions in the same namespace', async () => {
    const payload = body(); const first = await request('POST', '', payload); const second = await request('POST', '', payload);
    const replies = await Promise.all([request('POST', `/${first.json().id}/publish`), request('POST', `/${second.json().id}/publish`)]);
    expect(replies.map(r => r.statusCode).sort()).toEqual([201, 409]); expect(replies.find(r => r.statusCode === 409)?.json().code).toBe('ASSESSMENT_VERSION_ALREADY_PUBLISHED');
  });
  it('keeps published content immutable when edit and publication race', async () => {
    const item = await create();
    const [edit, publish] = await Promise.all([request('PATCH', `/${item.id}`, { title: 'Concurrent edit' }), request('POST', `/${item.id}/publish`)]);
    expect(publish.statusCode).toBe(201); expect([200, 409]).toContain(edit.statusCode);
    const row = await db.assessmentVersion.findUniqueOrThrow({ where: { id: item.id } }); expect(row.status).toBe('PUBLISHED'); expect(row.title).toBe(edit.statusCode === 200 ? 'Concurrent edit' : 'Synthetic authoring');
    expect((await request('PATCH', `/${item.id}`, { title: 'Too late' })).statusCode).toBe(409);
  });
  it('conceals foreign-clinic versions across reads and mutations', async () => {
    const clinic = await db.clinic.create({ data: { name: 'Synthetic foreign authoring', status: 'INACTIVE' } });
    const source = await db.assessmentVersion.create({ data: { clinicId: clinic.id, assessmentKey: 'MAIN', locale: 'en-US', versionNumber: 1, title: 'Foreign hidden', contentHash: 'a'.repeat(64), structure } });
    for (const [method, path, payload] of [['GET', `/${source.id}`, undefined], ['PATCH', `/${source.id}`, { title: 'Denied' }], ['POST', `/${source.id}/duplicate`, undefined], ['POST', `/${source.id}/publish`, undefined], ['POST', `/${source.id}/archive`, undefined]] as const) expect((await request(method, path, payload)).statusCode).toBe(404);
  });
  it('denies non-admin mutations over HTTP', async () => {
    for (const role of ['PATIENT', 'DOCTOR', 'STAFF']) {
      const who = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
      expect((await request('POST', '', body(), who)).statusCode).toBe(403);
    }
  });
});

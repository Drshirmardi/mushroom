import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment offering drafts (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let db: PrismaService;
  let clinicId: string;
  let admin: Awaited<ReturnType<typeof actor>>;
  let sourceId: string;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    admin = await actor('ADMIN', true);
    sourceId = (await questionnaire()).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  async function actor(role: string, membership = false) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    if (membership) await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    return auth;
  }
  async function questionnaire(options: { clinicId?: string; key?: string; locale?: string; draft?: boolean } = {}) {
    return db.assessmentVersion.create({ data: { clinicId: options.clinicId ?? clinicId, assessmentKey: options.key ?? 'MEZAJ', locale: options.locale ?? `x-${randomUUID().slice(0, 8)}`, versionNumber: 1, title: 'Synthetic offering questionnaire', contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [] }, status: options.draft ? 'DRAFT' : 'PUBLISHED', ...(options.draft ? {} : { publishedAt: new Date() }) } });
  }
  const body = () => ({ offeringKey: `TEST_${randomUUID().replaceAll('-', '').toUpperCase()}`, kind: 'INDIVIDUAL', title: 'Synthetic individual offering', assessmentVersionId: sourceId, priceMode: 'FREE', currency: 'IRR' });
  const request = (method: 'GET' | 'POST', path = '', payload?: object, key: string | undefined = randomUUID(), who = admin) => app.inject({ method, url: `/v1/admin/assessment-offerings${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  async function create(payload = body()) { const response = await request('POST', '/versions', payload); expect(response.statusCode).toBe(201); return response.json() as { id: string; offeringKey: string; versionNumber: number }; }

  it('creates a free immutable draft with explicit release blockers and no payment fabrication', async () => {
    const payload = body(); const response = await request('POST', '/versions', payload); expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ status: 'DRAFT', versionNumber: 1, amountRial: '0', currency: 'IRR', paymentPoint: null, algorithmId: null, releaseReadiness: { ready: false } });
    expect(response.json().releaseReadiness.blockers).toContain('CLINICAL_RELEASE_APPROVAL_REQUIRED');
    for (const field of ['idempotencyKey', 'payloadHash', 'createdByUserId']) expect(response.body).not.toContain(`"${field}"`);
    expect(await db.billingIntent.count({ where: { snapshot: { path: ['offeringKey'], equals: payload.offeringKey } } })).toBe(0);
  });
  it('accepts incomplete paid/couples configuration without inventing price or consent defaults', async () => {
    const response = await request('POST', '/versions', { ...body(), kind: 'COUPLES', priceMode: 'PAID' }); expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ amountRial: null, paymentPoint: null, policyDraft: {}, releaseReadiness: { ready: false } });
    expect(response.json().releaseReadiness.blockers).toEqual(expect.arrayContaining(['PRICE_CONFIGURATION_INCOMPLETE', 'COUPLES_SESSION_AND_ALGORITHM_APPROVAL_REQUIRED', 'DRAFT_POLICY_INCOMPLETE']));
  });
  it('stores integer prices and explicit payment points without enabling publication', async () => {
    const response = await request('POST', '/versions', { ...body(), priceMode: 'PAID', amountRial: '9000000000000000000', paymentPoint: 'PRE_RESULT_UNLOCK', algorithmId: 'UNAPPROVED_MODEL', algorithmVersion: 1, policyDraft: { minimumAgeYears: 18, quoteTtlSeconds: 600 } });
    expect(response.statusCode).toBe(201); expect(response.json()).toMatchObject({ amountRial: '9000000000000000000', paymentPoint: 'PRE_RESULT_UNLOCK', releaseReadiness: { ready: false } });
    expect((await request('POST', `/${response.json().id}/publish`)).statusCode).toBe(404);
  });
  it('replays simultaneous equivalent command keys once despite JSON property order', async () => {
    const payload = body(); const key = randomUUID();
    const reversed = Object.fromEntries(Object.entries(payload).reverse());
    const responses = await Promise.all(Array.from({ length: 10 }, (_, n) => request('POST', '/versions', n % 2 ? payload : reversed, key)));
    expect(responses.map(r => r.statusCode)).toEqual(Array(10).fill(201)); expect(new Set(responses.map(r => r.json().id)).size).toBe(1);
    expect(await db.assessmentOfferingVersion.count({ where: { offeringKey: payload.offeringKey } })).toBe(1);
    expect(await db.auditEvent.count({ where: { subjectId: responses[0].json().id, action: 'ASSESSMENT_OFFERING_VERSION_CREATED' } })).toBe(1);
    const changed = await request('POST', '/versions', { ...payload, title: 'Changed' }, key); expect(changed.statusCode).toBe(409); expect(changed.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  it('serializes distinct version commands into consecutive immutable versions', async () => {
    const payload = body(); const responses = await Promise.all(Array.from({ length: 8 }, (_, n) => request('POST', '/versions', { ...payload, title: `Version ${n}` })));
    expect(responses.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(responses.map(r => r.json().versionNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('rejects changing stable kind/locale/questionnaire family', async () => {
    const payload = body(); await create(payload);
    const differentLocale = await questionnaire(); const differentKey = await questionnaire({ key: 'MAIN', locale: (await db.assessmentVersion.findUniqueOrThrow({ where: { id: sourceId } })).locale });
    for (const change of [{ kind: 'COUPLES' }, { assessmentVersionId: differentLocale.id }, { assessmentVersionId: differentKey.id }]) { const response = await request('POST', '/versions', { ...payload, ...change }); expect(response.statusCode).toBe(409); expect(response.json().code).toBe('ASSESSMENT_OFFERING_CONFLICT'); }
  });
  it('requires ADMIN and explicit active clinic membership on every route', async () => {
    const item = await create(); const foreignAdmin = await actor('ADMIN');
    for (const who of [await actor('PATIENT'), await actor('DOCTOR'), await actor('STAFF'), foreignAdmin]) {
      for (const [method, path, payload] of [['GET', '', undefined], ['GET', `/${item.id}`, undefined], ['POST', '/versions', body()], ['POST', `/${item.id}/retire`, undefined]] as const) expect((await request(method, path, payload, randomUUID(), who)).statusCode).toBe(403);
    }
    expect((await app.inject({ method: 'GET', url: '/v1/admin/assessment-offerings' })).statusCode).toBe(401);
  });
  it('conceals foreign clinic/draft questionnaire references and foreign offering ids', async () => {
    const other = await db.clinic.create({ data: { name: 'Synthetic other', status: 'INACTIVE' } }); const foreign = await questionnaire({ clinicId: other.id }); const draft = await questionnaire({ draft: true });
    for (const id of [foreign.id, draft.id]) expect((await request('POST', '/versions', { ...body(), assessmentVersionId: id })).statusCode).toBe(404);
    const foreignRow = await db.assessmentOfferingVersion.create({ data: { clinicId: other.id, offeringKey: 'FOREIGN', versionNumber: 1, kind: 'INDIVIDUAL', title: 'Foreign hidden', locale: foreign.locale, assessmentVersionId: foreign.id, priceMode: 'FREE', amountRial: 0n, currency: 'IRR', createdByUserId: admin.userId, idempotencyKey: randomUUID(), payloadHash: 'a'.repeat(64) } });
    expect((await request('GET', `/${foreignRow.id}`)).statusCode).toBe(404); expect((await request('POST', `/${foreignRow.id}/retire`)).statusCode).toBe(404);
    expect((await request('GET')).body).not.toContain(foreignRow.id);
  });
  it('validates money, cross-field configuration and strict bounded DTOs', async () => {
    for (const extra of [{ amountRial: '1' }, { paymentPoint: 'PRE_START' }, { priceMode: 'PAID', amountRial: '0' }, { priceMode: 'PAID', amountRial: '9000000000000000001' }, { algorithmId: 'ONE_WITHOUT_VERSION' }]) expect((await request('POST', '/versions', { ...body(), ...extra })).statusCode).toBe(422);
    for (const extra of [{ amountRial: 12 }, { amountRial: '01' }, { amountRial: '0.5' }, { currency: 'TOMAN' }, { status: 'PUBLISHED' }, { policyDraft: { madeUp: true } }, { policyDraft: { quoteTtlSeconds: 0 } }]) expect((await request('POST', '/versions', { ...body(), ...extra })).statusCode).toBe(400);
    for (const query of ['?page=0', '?pageSize=51', '?clinicId=foreign']) expect((await request('GET', query)).statusCode).toBe(400);
    expect((await request('POST', '/versions', body(), '')).json().code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
  it('lists a bounded configuration history and retires idempotently without content changes', async () => {
    const payload = body(); const key = randomUUID(); const created = await request('POST', '/versions', payload, key); const id = created.json().id;
    await create(payload); await create(payload);
    const listed = await request('GET', `?offeringKey=${payload.offeringKey}&pageSize=2`); expect(listed.json().items).toHaveLength(2); expect(listed.json().total).toBe(3); expect(listed.headers['cache-control']).toBe('private, no-store');
    const retired = await Promise.all([request('POST', `/${id}/retire`), request('POST', `/${id}/retire`)]); expect(retired.map(r => r.statusCode)).toEqual([201, 201]); expect(retired[0].json().retiredAt).toBe(retired[1].json().retiredAt);
    expect(await db.auditEvent.count({ where: { subjectId: id, action: 'ASSESSMENT_OFFERING_RETIRED' } })).toBe(1);
    const replay = await request('POST', '/versions', payload, key); expect(replay.json().id).toBe(id); expect(replay.json().status).toBe('RETIRED'); expect(replay.json().releaseReadiness.blockers).toContain('OFFERING_RETIRED');
  });
  it('database blocks content rewrites, deletes, publication and version gaps', async () => {
    const item = await create();
    await expect(db.assessmentOfferingVersion.update({ where: { id: item.id }, data: { title: 'Rewrite' } })).rejects.toThrow(/immutable/);
    await expect(db.assessmentOfferingVersion.delete({ where: { id: item.id } })).rejects.toThrow(/retained/);
    await expect(db.assessmentOfferingVersion.update({ where: { id: item.id }, data: { status: 'PUBLISHED' } })).rejects.toThrow();
    const row = await db.assessmentOfferingVersion.findUniqueOrThrow({ where: { id: item.id } });
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, policyDraft: {}, id: randomUUID(), versionNumber: 3, idempotencyKey: randomUUID() } })).rejects.toThrow(/consecutive/);
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, policyDraft: {}, id: randomUUID(), offeringKey: `BAD_${randomUUID().replaceAll('-', '').toUpperCase()}`, versionNumber: 1, amountRial: null, idempotencyKey: randomUUID() } })).rejects.toThrow();
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, policyDraft: {}, id: randomUUID(), versionNumber: 2, kind: 'COUPLES', idempotencyKey: randomUUID() } })).rejects.toThrow(/stable/);
    const other = await db.clinic.create({ data: { name: 'Synthetic SQL scope', status: 'INACTIVE' } }); const foreign = await questionnaire({ clinicId: other.id });
    await expect(db.assessmentOfferingVersion.create({ data: { ...row, policyDraft: {}, id: randomUUID(), offeringKey: `SCOPE_${randomUUID().replaceAll('-', '').toUpperCase()}`, assessmentVersionId: foreign.id, locale: foreign.locale, idempotencyKey: randomUUID() } })).rejects.toThrow(/same-clinic/);
  });
  it('rolls back creation/retirement and fails reads when their audit fails', async () => {
    const isolated = await actor('ADMIN', true); const payload = body(); const opened = await request('POST', '/versions', payload, randomUUID(), isolated); const id = opened.json().id;
    if (!/^[a-f0-9-]{36}$/.test(isolated.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION offerings_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id = '${isolated.userId}'::uuid THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER offerings_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION offerings_test_audit_fail()`);
    const failedPayload = body();
    try {
      for (const [method, path, data] of [['POST', '/versions', failedPayload], ['POST', `/${id}/retire`, undefined], ['GET', `/${id}`, undefined], ['GET', '', undefined]] as const) { const response = await request(method, path, data, randomUUID(), isolated); expect(response.statusCode).toBe(500); expect(response.body).not.toContain('synthetic audit failure'); }
      expect(await db.assessmentOfferingVersion.count({ where: { offeringKey: failedPayload.offeringKey } })).toBe(0);
      expect((await db.assessmentOfferingVersion.findUniqueOrThrow({ where: { id } })).status).toBe('DRAFT');
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER offerings_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION offerings_test_audit_fail()`); }
  });
});

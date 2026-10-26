import { createCompleteTestPatient } from './patient-entry-test-support';
import { createHash, randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';
import { MEZAJ_CODES } from '../src/modules/commerce/mezaj/commerce-mezaj.dto';
import { ASSESSMENT_SCORING_IDENTITY } from '../src/modules/assessments/domain/assessment-scoring';

describe.skipIf(process.env.STORE_MEZAJ_TEST_ISOLATED !== '1')('ordered Mezaj commerce (isolated PostgreSQL API)', () => {
  let app: NestFastifyApplication; let db: PrismaService; let clinicId: string; let versionId: string;
  let admin: Awaited<ReturnType<typeof createTestAccessToken>>; let staff: typeof admin;
  const products: string[] = []; const pairs = MEZAJ_CODES.flatMap(primary => MEZAJ_CODES.map(secondary => ({ primary, secondary })));
  const call = (method: 'GET' | 'PUT', path: string, actor = admin, payload?: object) => app.inject({ method, url: `/v1/${path}`, headers: { authorization: `Bearer ${actor.token}`, origin: 'http://localhost:3000' }, ...(payload ? { payload } : {}) });
  const pairPath = (i: number) => `admin/commerce/mezaj/collections/${pairs[i].primary}/${pairs[i].secondary}`;
  async function source(review = false) {
    const structure = { schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'NUMBER', required: true, min: 0, max: 15, scoreRanges: pairs.map((_, i) => ({ minInclusive: i, maxExclusive: i + 1, score: i })) }] }], resultBands: pairs.map((_, i) => ({ id: `band-${i}`, title: `Synthetic band ${i}`, minInclusive: i, maxExclusive: i + 1, requiresReview: review })) };
    const last = await db.assessmentVersion.aggregate({ where: { clinicId, assessmentKey: 'MEZAJ', locale: 'fa-IR' }, _max: { versionNumber: true } });
    await db.assessmentVersion.updateMany({ where: { clinicId, assessmentKey: 'MEZAJ', locale: 'fa-IR', status: 'PUBLISHED' }, data: { status: 'RETIRED', retiredAt: new Date() } });
    return db.assessmentVersion.create({ data: { clinicId, assessmentKey: 'MEZAJ', locale: 'fa-IR', versionNumber: (last._max.versionNumber ?? 0) + 1, title: 'Synthetic ordered mapping source', structure, contentHash: createHash('sha256').update(JSON.stringify(structure)).digest('hex'), status: 'PUBLISHED', publishedAt: new Date() } });
  }
  async function patient() {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    const role = await db.role.findUniqueOrThrow({ where: { code: 'PATIENT' } }); await db.userRole.create({ data: { userId: auth.userId, roleId: role.id } });
    const profile = await createCompleteTestPatient(db, { data: { userId: auth.userId, clinicId } }); return { auth, profile };
  }
  async function result(i: number, who?: Awaited<ReturnType<typeof patient>>, version?: Awaited<ReturnType<typeof source>>, tamper = false) {
    who ??= await patient(); version ??= await db.assessmentVersion.findUniqueOrThrow({ where: { id: versionId } });
    const b = (version.structure as { resultBands: { id: string; title: string; requiresReview: boolean }[] }).resultBands[i];
    const payloadHash = 'a'.repeat(64); const snapshot = { ...ASSESSMENT_SCORING_IDENTITY, questionnaireContentHash: tamper ? 'b'.repeat(64) : version.contentHash, answerPayloadHash: payloadHash, resultBand: { id: b.id, title: b.title, riskLevel: 'NONE', requiresReview: b.requiresReview }, answers: { q: i }, score: i };
    const attempt = (await db.patientAssessmentSubmission.count({ where: { patientId: who.profile.id, assessmentVersionId: version.id } })) + 1;
    const submission = await db.patientAssessmentSubmission.create({ data: { patientId: who.profile.id, assessmentVersionId: version.id, attemptNumber: attempt, state: 'COMPLETE', completedAt: new Date(), completionPayloadHash: payloadHash, completionIdempotencyKey: randomUUID(), resultSnapshot: snapshot } });
    await db.mezajResult.create({ data: { patientId: who.profile.id, assessmentVersionId: version.id, assessmentSubmissionId: submission.id, resultBandSnapshot: snapshot.resultBand, assessedAt: new Date() } }); return who;
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/store_mezaj_verify_[a-f0-9]{32}$/.test(url.pathname) || process.env.STORE_MEZAJ_TEST_ISOLATED !== '1') throw Error('Run test:commerce-mezaj with its disposable database.');
    app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } })).id;
    const tokens = app.get(AccessTokenService); admin = await createTestAccessToken(db, tokens, ['ADMIN']); staff = await createTestAccessToken(db, tokens, ['STAFF']);
    versionId = (await source()).id;
    const category = await db.commerceCategory.create({ data: { clinicId, name: 'Synthetic collection', slug: `synthetic-${randomUUID()}` } });
    for (let i = 0; i < 16; i++) {
      const p = await db.commerceProduct.create({ data: { clinicId, categoryId: category.id, title: `Synthetic product ${i}`, slug: `synthetic-${randomUUID()}`, status: 'ACTIVE', skus: { create: { clinicId, code: `SKU-${randomUUID()}`, currentPriceToman: 125000, currentTaxToman: 5000 } } } }); products.push(p.id);
      const r = await call('PUT', pairPath(i), admin, { expectedRevision: 0, enabled: true, productIds: [p.id], sources: [{ assessmentVersionId: versionId, resultBandId: `band-${i}` }] }); expect(r.statusCode, r.body).toBe(200);
    }
  }, 60_000);
  afterAll(async () => { if (app) await app.close(); });

  it.each(pairs.map((p, i) => [i, p.primary, p.secondary] as const))('matches exact ordered combination %s (%s / %s)', async (i, primary, secondary) => {
    const who = await result(i);
    const r = await call('GET', 'patients/me/commerce/recommendations', who.auth);
    expect(r.statusCode, r.body).toBe(200); expect(r.json()).toMatchObject({ status: 'READY', primary, secondary });
    expect(r.json().items.map((p: { id: string }) => p.id)).toEqual([products[i]]);
    expect(r.body).not.toMatch(/answers|resultSnapshot|completionPayloadHash|sourceContentHash/);
  });
  it('lists all sixteen pairs, preserving reverse-order distinction and exact source metadata', async () => {
    const r = await call('GET', 'admin/commerce/mezaj/collections'); expect(r.statusCode).toBe(200); expect(r.json()).toHaveLength(16);
    expect(new Set(r.json().map((p: { primary: string; secondary: string }) => `${p.primary}:${p.secondary}`)).size).toBe(16);
    expect(r.json()[1].products[0].id).not.toBe(r.json()[4].products[0].id);
    const versions = await call('GET', 'admin/commerce/mezaj/assessment-versions?page=1'); expect(versions.json().items[0].resultBands).toHaveLength(16); expect(versions.body).not.toContain('questions');
  });
  it('returns explicit no-result without accessing another patient via query input', async () => {
    const withResult = await result(0); const empty = await patient();
    const r = await call('GET', `patients/me/commerce/recommendations?patientId=${withResult.profile.id}`, empty.auth);
    expect(r.statusCode).toBe(400);
    expect((await call('GET', 'patients/me/commerce/recommendations', empty.auth)).json()).toEqual({ status: 'NO_RESULT', primary: null, secondary: null, items: [] });
  });
  it('requires patient self permissions and ADMIN commerce authority', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/patients/me/commerce/recommendations' })).statusCode).toBe(401);
    const p = await patient();
    expect((await call('GET', 'admin/commerce/mezaj/collections', p.auth)).statusCode).toBe(403);
    expect((await call('GET', 'admin/commerce/mezaj/collections', staff)).statusCode).toBe(403);
    expect((await call('GET', 'patients/me/commerce/recommendations', admin)).statusCode).toBe(403);
  });
  it('does not reuse older configured results when the latest valid result is unmapped', async () => {
    const who = await result(0); await result(0, who, await source());
    expect((await call('GET', 'patients/me/commerce/recommendations', who.auth)).json().status).toBe('NOT_CONFIGURED');
  });
  it('blocks automatic product recommendations for a review-required result', async () => {
    const who = await result(0, await patient(), await source(true));
    expect((await call('GET', 'patients/me/commerce/recommendations', who.auth)).json()).toEqual({ status: 'REVIEW_REQUIRED', primary: null, secondary: null, items: [] });
  });
  it('rejects unsupported persisted provenance instead of parsing result titles', async () => {
    const who = await result(0, await patient(), await db.assessmentVersion.findUniqueOrThrow({ where: { id: versionId } }), true);
    expect((await call('GET', 'patients/me/commerce/recommendations', who.auth)).json().status).toBe('RESULT_UNSUPPORTED');
  });
  it('prevents a band from being assigned to two different combinations', async () => {
    const r = await call('PUT', pairPath(0), admin, { expectedRevision: 1, enabled: true, productIds: [products[0]], sources: [{ assessmentVersionId: versionId, resultBandId: 'band-1' }] }); expect(r.statusCode).toBe(409);
  });
  it('serializes competing edits with a revision precondition', async () => {
    const body = { expectedRevision: 1, enabled: true, productIds: [products[15]], sources: [{ assessmentVersionId: versionId, resultBandId: 'band-15' }] };
    const r = await Promise.all([call('PUT', pairPath(15), admin, body), call('PUT', pairPath(15), admin, body)]); expect(r.map(x => x.statusCode).sort()).toEqual([200, 409]);
  });
  it('filters newly archived products and hides a disabled collection immediately', async () => {
    const who = await result(14); await db.commerceProduct.update({ where: { id: products[14] }, data: { status: 'ARCHIVED' } });
    expect((await call('GET', 'patients/me/commerce/recommendations', who.auth)).json().status).toBe('NO_PRODUCTS');
    await db.commerceProduct.update({ where: { id: products[14] }, data: { status: 'ACTIVE' } });
    expect((await call('PUT', pairPath(14), admin, { expectedRevision: 1, enabled: false, productIds: [products[14]], sources: [{ assessmentVersionId: versionId, resultBandId: 'band-14' }] })).statusCode).toBe(200);
    expect((await call('GET', 'patients/me/commerce/recommendations', who.auth)).json().status).toBe('NOT_CONFIGURED');
  });
  it('validates ordered codes, active products, exact source and membership bounds', async () => {
    const body = { expectedRevision: 1, enabled: true, productIds: [products[0]], sources: [{ assessmentVersionId: versionId, resultBandId: 'band-0' }] };
    expect((await call('PUT', 'admin/commerce/mezaj/collections/unknown/damavi', admin, body)).statusCode).toBe(400);
    expect((await call('PUT', pairPath(0), admin, { ...body, productIds: Array(21).fill(products[0]) })).statusCode).toBe(400);
    expect((await call('PUT', pairPath(0), admin, { ...body, sources: [{ assessmentVersionId: versionId, resultBandId: 'missing' }] })).statusCode).toBe(422);
    expect((await call('PUT', pairPath(0), admin, { ...body, productIds: [randomUUID()] })).statusCode).toBe(422);
  });
  it('enforces pair constraints in PostgreSQL and records audited medical reads without answers', async () => {
    await expect(db.$executeRaw(Prisma.sql`INSERT INTO commerce_mezaj_collections(id,clinic_id,primary_mezaj,secondary_mezaj,updated_at) VALUES(${randomUUID()}::uuid,${clinicId}::uuid,'bad','damavi',now())`)).rejects.toThrow();
    const event = await db.patientAccessAudit.findFirstOrThrow({ where: { resourceType: 'STORE_MEZAJ_RECOMMENDATIONS' } }); expect(event.metadata).toHaveProperty('status'); expect(JSON.stringify(event.metadata)).not.toMatch(/answers|score|damavi/);
  });
});

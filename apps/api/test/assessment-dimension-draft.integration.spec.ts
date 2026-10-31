import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { MIZAJ_DRAFT_PRESET } from '../src/modules/assessments/domain/mizaj-draft-preset';
import { canonicalAssessmentJson } from '../src/modules/assessments/domain/assessment-canonical-json';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('Mizaj draft preview (isolated PostgreSQL HTTP)', () => {
  let app: NestFastifyApplication, db: PrismaService;
  let admin: Awaited<ReturnType<typeof actor>>;
  async function actor(role: 'ADMIN' | 'PATIENT' | 'DOCTOR') {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    return auth;
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || !['/patient_journey_mizaj_preview_test', '/patient_journey_test'].includes(target.pathname)) throw new Error('Explicit isolated Mizaj disposable PostgreSQL on localhost:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService); admin = await actor('ADMIN');
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  const request = (method: 'GET' | 'POST' | 'PATCH', path: string, payload?: object, who = admin) => app.inject({ method, url: `/v1/admin/assessments${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  const candidate = () => ({ ...structuredClone(MIZAJ_DRAFT_PRESET), assessmentKey: `MIZAJ_${randomUUID()}` });
  async function create() { const r = await request('POST', '', candidate()); expect(r.statusCode).toBe(201); return r.json() as { id: string; contentHash: string }; }
  const answers = () => Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`q${i + 1}`, [8, 9].includes(i + 1) ? 'o2' : 'o1']));
  const body = (hash: string) => ({ expectedContentHash: hash, syntheticAnswersOnly: true, answers: answers() });
  const preview = (row: { id: string; contentHash: string }) => request('POST', `/${row.id}/scoring-preview`, body(row.contentHash));

  it('persists a version-two secondary path and chooses only the permitted next question over HTTP', async () => {
    const base = candidate(); const structure = base.structure;
    const dimensions = structure.scoring.dimensions.map(item => item.id);
    const questions = structure.sections.flatMap(section => section.questions);
    for (const question of questions) question.options.forEach((option, index) => { option.scores = { [dimensions[index]!]: 1 }; });
    questions[10]!.options[0]!.scores = {};
    const root = { id: 'tieFirst', title: 'Synthetic first', tiedDimensions: dimensions.slice(1), options: [{ id: 'yes', title: 'Direct', dimensionId: dimensions[1]! }, { id: 'no', title: 'Next', dimensionId: null }], steps: [{ id: 'tieLast', title: 'Synthetic last', tiedDimensions: dimensions.slice(2), options: [{ id: 'left', title: 'Left', dimensionId: dimensions[2]! }, { id: 'right', title: 'Right', dimensionId: dimensions[3]! }] }] };
    const created = await request('POST', '', { ...base, structure: { ...structure, schemaVersion: 3, scoring: { ...structure.scoring, algorithmId: 'DIMENSION_TIEBREAK', algorithmVersion: 2, minInformativeAnswers: 1 }, followUps: [root] } });
    expect(created.statusCode).toBe(201);
    const saved = created.json();
    const selection = [0,0,0,0,1,1,2,2,3,3,0];
    const main = Object.fromEntries(questions.map((question, index) => [question.id, question.options[selection[index]!]!.id]));
    const evaluate = (answers: object) => request('POST', `/${saved.id}/scoring-preview`, { expectedContentHash: saved.contentHash, syntheticAnswersOnly: true, answers });
    expect((await evaluate(main)).json()).toMatchObject({ algorithmVersion: 2, status: 'FOLLOW_UP_REQUIRED', primary: dimensions[0], followUp: { id: root.id } });
    expect((await evaluate({ ...main, tieFirst: 'no' })).json()).toMatchObject({ status: 'FOLLOW_UP_REQUIRED', followUp: { id: 'tieLast' } });
    expect((await evaluate({ ...main, tieFirst: 'no', tieLast: 'right' })).json()).toMatchObject({ status: 'PAIR', primary: dimensions[0], secondary: dimensions[3] });
    expect((await evaluate({ ...main, tieFirst: 'yes', tieLast: 'right' })).statusCode).toBe(422);
  });

  it('serves a clone of the full unreviewed preset without saving an assessment', async () => {
    const count = await db.assessmentVersion.count(); const r = await request('GET', '/draft-presets/mizaj');
    expect(r.statusCode).toBe(200); expect(r.headers['cache-control']).toBe('no-store'); expect(r.json()).toEqual(MIZAJ_DRAFT_PRESET);
    expect(await db.assessmentVersion.count()).toBe(count);
  });
  it('creates, reads, updates, duplicates and previews a persisted draft with an exact metadata-only audit', async () => {
    const row = await create(); const before = await db.patientAssessmentSubmission.count();
    const r = await preview(row); expect(r.statusCode).toBe(200); expect(r.headers['cache-control']).toBe('no-store');
    expect(r.json()).toMatchObject({ assessmentVersionId: row.id, questionnaireContentHash: row.contentHash, status: 'PAIR', primary: 'DAMAVI', secondary: 'SAFRAVI', scores: { DAMAVI: 3, SAFRAVI: 2, BALGHAMI: 0, SODAVI: 0 }, reviewState: 'UNREVIEWED', educationalOnly: true, profile: { id: 'DAMAVI_SAFRAVI' } });
    expect(await db.patientAssessmentSubmission.count()).toBe(before);
    const audits = await db.auditEvent.findMany({ where: { subjectId: row.id, action: 'ASSESSMENT_DRAFT_PREVIEWED' } });
    expect(audits).toHaveLength(1); expect(audits[0]).toMatchObject({ actorUserId: admin.userId, actorSessionId: admin.sessionId, metadata: {} });
    const changed = candidate().structure; changed.resultProfiles[0]!.summary = 'Synthetic updated display copy';
    expect((await request('PATCH', `/${row.id}`, { structure: changed })).statusCode).toBe(200);
    expect((await request('GET', `/${row.id}`)).json().structure).toEqual(changed);
    const copy = await request('POST', `/${row.id}/duplicate`); expect(copy.statusCode).toBe(201); expect(copy.json()).toMatchObject({ status: 'DRAFT', versionNumber: 2, structure: changed });
    expect((await preview({ id: copy.json().id, contentHash: copy.json().contentHash })).statusCode).toBe(200);
  });
  it('rejects stale hash and refuses to publish the preview algorithm', async () => {
    const row = await create();
    const stale = await request('POST', `/${row.id}/scoring-preview`, body('0'.repeat(64))); expect(stale.statusCode).toBe(409); expect(stale.json().code).toBe('ASSESSMENT_PREVIEW_CONFLICT');
    const r = await request('POST', `/${row.id}/publish`); expect(r.statusCode).toBe(422); expect(r.json().code).toBe('ASSESSMENT_STRUCTURE_INVALID');
    expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('DRAFT');
  });
  it('prevents the legacy scalar editor from silently downgrading a dimension draft', async () => {
    const row = await create();
    const dimension = candidate().structure;
    const legacyEditorOutput = { ...dimension, schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'SINGLE_CHOICE', required: true, options: [{ id: 'a', score: 0 }, { id: 'b', score: 0 }] }] }] };
    expect((await request('PATCH', `/${row.id}`, { structure: legacyEditorOutput })).statusCode).toBe(422);
    expect((await request('POST', '', { ...candidate(), structure: legacyEditorOutput })).statusCode).toBe(422);
    expect((await preview(row)).statusCode).toBe(200);
  });
  it('rechecks the current hash after waiting for an actual concurrent writer', async () => {
    const row = await create(); let release!: () => void; let locked!: () => void;
    const ready = new Promise<void>(resolve => { locked = resolve; }); const proceed = new Promise<void>(resolve => { release = resolve; });
    const changed = candidate().structure; changed.resultProfiles[0]!.summary = 'Synthetic concurrent draft change';
    const hash = createHash('sha256').update(canonicalAssessmentJson(changed)).digest('hex');
    const writer = db.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${row.id}::uuid FOR UPDATE`); locked(); await proceed;
      await tx.assessmentVersion.update({ where: { id: row.id }, data: { structure: changed, contentHash: hash } });
    }, { timeout: 10000 });
    await ready; const pending = preview(row);
    try {
      let observed = false;
      for (let i = 0; i < 100; i++) {
        const waiters = await db.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM assessment_versions WHERE id=%'`);
        if (Number(waiters[0]!.count) > 0) { observed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed).toBe(true);
    } finally { release(); await writer; }
    const response = await pending; expect(response.statusCode).toBe(409); expect(response.json().code).toBe('ASSESSMENT_PREVIEW_CONFLICT');
    expect(await db.auditEvent.count({ where: { subjectId: row.id, action: 'ASSESSMENT_DRAFT_PREVIEWED' } })).toBe(0);
  });
  it('checks current state, v1 incompatibility, missing and foreign-clinic sources', async () => {
    const row = await create(); const legacy = { assessmentKey: `LEGACY_${randomUUID()}`, title: 'Synthetic legacy', locale: 'en-US', structure: { schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }] } };
    const old = await request('POST', '', legacy); expect(old.statusCode).toBe(201);
    expect((await preview(old.json())).statusCode).toBe(422);
    expect((await request('POST', `/${old.json().id}/publish`)).statusCode).toBe(201);
    expect((await preview(old.json())).statusCode).toBe(409);
    expect((await request('POST', `/${old.json().id}/archive`)).statusCode).toBe(201);
    expect((await preview(old.json())).statusCode).toBe(409);
    expect((await preview({ ...row, id: randomUUID() })).statusCode).toBe(404);
    const clinic = await db.clinic.create({ data: { name: 'Synthetic foreign preview clinic', status: 'INACTIVE', timeZone: 'Asia/Tehran' } });
    const foreign = await db.assessmentVersion.create({ data: { clinicId: clinic.id, assessmentKey: 'FOREIGN', versionNumber: 1, title: 'Synthetic foreign', locale: 'fa-IR', structure: MIZAJ_DRAFT_PRESET.structure, contentHash: row.contentHash } });
    expect((await preview({ id: foreign.id, contentHash: foreign.contentHash })).statusCode).toBe(404);
  });
  it('denies unauthenticated and non-admin roles on both new routes', async () => {
    const row = await create();
    for (const [method, path, payload] of [['GET', '/draft-presets/mizaj', undefined], ['POST', `/${row.id}/scoring-preview`, body(row.contentHash)]] as const) {
      expect((await app.inject({ method, url: `/v1/admin/assessments${path}`, ...(payload ? { payload } : {}) })).statusCode).toBe(401);
      for (const role of ['PATIENT', 'DOCTOR'] as const) expect((await request(method, path, payload, await actor(role))).statusCode).toBe(403);
    }
  });
  it('rejects forged patient IDs, malformed answers, missing acknowledgement and invalid weights', async () => {
    const row = await create();
    for (const payload of [{ ...body(row.contentHash), patientId: randomUUID() }, { ...body(row.contentHash), syntheticAnswersOnly: false }, { expectedContentHash: row.contentHash, answers: answers() }, { ...body(row.contentHash), expectedContentHash: 'bad' }]) expect((await request('POST', `/${row.id}/scoring-preview`, payload)).statusCode).toBe(400);
    const r = await request('POST', `/${row.id}/scoring-preview`, { ...body(row.contentHash), answers: { ...answers(), q1: 'missing' } }); expect(r.statusCode).toBe(422); expect(r.json().code).toBe('ASSESSMENT_ANSWERS_INVALID');
    const bad = candidate(); bad.structure.sections[0]!.questions[0]!.options[0]!.scores = { DAMAVI: -1 };
    expect((await request('POST', '', bad)).statusCode).toBe(422);
    expect(await db.auditEvent.count({ where: { subjectId: row.id, action: 'ASSESSMENT_DRAFT_PREVIEWED' } })).toBe(0);
  });
  it('withholds preview output when the transactional audit fails', async () => {
    const row = await create();
    if (!/^[a-f0-9-]{36}$/u.test(admin.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION mizaj_preview_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${admin.userId}'::uuid AND NEW.action='ASSESSMENT_DRAFT_PREVIEWED' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER mizaj_preview_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION mizaj_preview_test_audit_fail()`);
    try { expect((await preview(row)).statusCode).toBe(500); expect(await db.auditEvent.count({ where: { subjectId: row.id, action: 'ASSESSMENT_DRAFT_PREVIEWED' } })).toBe(0); }
    finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER mizaj_preview_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION mizaj_preview_test_audit_fail()`); }
  });
});

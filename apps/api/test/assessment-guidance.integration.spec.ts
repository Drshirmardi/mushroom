import { createCompleteTestPatient } from './patient-entry-test-support';
import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment educational guidance (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string, roleId: string, guidanceId: string, serviceId: string;
  let originalGrant = true;
  let admin: Awaited<ReturnType<typeof actor>>, doctor: Awaited<ReturnType<typeof actor>>;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? ''); if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService); clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    roleId = (await db.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } })).id; originalGrant = !!await db.clinicalRolePermission.findUnique({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } } }); await grant();
    admin = await actor('ADMIN'); doctor = await actor('DOCTOR'); guidanceId = (await guidance()).id; serviceId = (await service()).id;
  }, 30_000);
  afterAll(async () => { if (db && !originalGrant) await db.clinicalRolePermission.deleteMany({ where: { roleId, permission: 'CLINICAL_RECORD_SIGN' } }); await app?.close(); });
  async function grant() { await db.clinicalRolePermission.upsert({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } }, create: { roleId, permission: 'CLINICAL_RECORD_SIGN' }, update: {} }); }
  async function actor(role: 'ADMIN' | 'DOCTOR' | 'PATIENT', membership = true, liveRole = true) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    if (liveRole) await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (role === 'PATIENT') await createCompleteTestPatient(db, { data: { userId: auth.userId, clinicId } });
    else if (membership) await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    if (role === 'DOCTOR') {
      const key = randomUUID(); const specialty = await db.specialty.create({ data: { clinicId, name: key, canonicalName: key, isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
      const d = await db.doctorProfile.create({ data: { clinicId, userId: auth.userId, displayName: 'Synthetic mapping reviewer' } });
      await db.doctorSpecialty.create({ data: { clinicId, doctorId: d.id, specialtyId: specialty.id } }); await db.doctorProfile.update({ where: { id: d.id }, data: { isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
    }
    return auth;
  }
  const req = (method: 'GET' | 'POST', path: string, who = admin, payload?: object, key: string | null = randomUUID()) => app.inject({ method, url: `/v1/${path}`, headers: { authorization: `Bearer ${who.token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  const attestation = (row: { contentHash: string }) => ({ contentHash: row.contentHash, educationalOnly: true, noDiagnosisOrTherapeuticDiet: true });
  async function guidance(who = doctor, approve = true) {
    const category = await db.articleCategory.create({ data: { clinicId, name: 'Synthetic guidance source', slug: `synthetic-${randomUUID()}` } });
    const article = await db.article.create({ data: { clinicId, categoryId: category.id, slug: `synthetic-${randomUUID()}`, title: 'Synthetic education', body: 'Only synthetic test education.' } });
    const r = await req('POST', 'admin/guidance-content/versions', admin, { articleId: article.id, locale: 'fa-IR', kind: 'GENERAL_EDUCATION', provenance: [{ label: 'Synthetic', url: 'https://example.org/synthetic', accessedOn: '2026-10-16' }], safety: { intendedAudience: 'Synthetic', limitations: 'Education only', contraindications: [], seekProfessionalCare: 'Consult a qualified professional' } }); expect(r.statusCode).toBe(201);
    if (approve) expect((await req('POST', `clinical/guidance-content/${r.json().id}/approve`, who, attestation(r.json()))).statusCode).toBe(201);
    return r.json() as { id: string; contentHash: string };
  }
  async function service() {
    const key = randomUUID(); const s = await db.service.create({ data: { clinicId, name: `Synthetic ${key}`, canonicalName: `synthetic ${key}`, description: 'Synthetic directory description', isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
    await db.doctorService.create({ data: { clinicId, serviceId: s.id, doctorId: (await db.doctorProfile.findUniqueOrThrow({ where: { userId: doctor.userId } })).id, visitMode: 'IN_PERSON', durationMinutes: 30, priceAmount: 100000, currency: 'IRR', isActive: true, publicationStatus: 'PUBLISHED', publishedAt: new Date() } }); return s;
  }
  async function source(requiresReview = false, scope = clinicId) {
    const structure = { schemaVersion: 1, sections: [{ id: 'one', title: 'Synthetic', questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }], resultBands: [{ id: 'match', title: 'Synthetic band', minInclusive: 0, maxExclusive: 2, riskLevel: 'NONE', requiresReview }] };
    return db.assessmentVersion.create({ data: { clinicId: scope, assessmentKey: `TEST_${randomUUID()}`, locale: 'fa-IR', versionNumber: 1, title: 'Synthetic questionnaire', structure, contentHash: createHash('sha256').update(JSON.stringify(structure)).digest('hex'), status: 'PUBLISHED', publishedAt: new Date() } });
  }
  const body = (assessmentVersionId: string, content = guidanceId, services: string[] = [serviceId]) => ({ assessmentVersionId, resultBandId: 'match', guidanceContentIds: [content], serviceIds: services, recommendConsultation: true });
  async function mapping(version: string, content = guidanceId, services?: string[]) { const r = await req('POST', 'admin/assessment-guidance/versions', admin, body(version, content, services)); expect(r.statusCode).toBe(201); return r.json() as { id: string; contentHash: string; versionNumber: number }; }
  const approve = (row: { id: string; contentHash: string }, who = doctor) => req('POST', `clinical/assessment-guidance/${row.id}/approve`, who, attestation(row));
  async function completed(version: string, who?: Awaited<ReturnType<typeof actor>>) {
    const p = who ?? await actor('PATIENT'); const patientId = (await db.patientProfile.findUniqueOrThrow({ where: { userId: p.userId } })).id;
    const submission = await db.patientAssessmentSubmission.create({ data: { patientId, assessmentVersionId: version, answers: { q: true } } });
    const done = await req('POST', `assessment-submissions/${submission.id}/submit`, p, { expectedRevision: 0 }); expect(done.statusCode).toBe(201); return { ...submission, who: p };
  }
  const read = (row: { id: string; who: Awaited<ReturnType<typeof actor>> }) => req('GET', `assessment-submissions/${row.id}/guidance`, row.who);
  async function historical(attempt: { id: string; who: Awaited<ReturnType<typeof actor>> }, snapshot: Prisma.InputJsonObject) {
    const original = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: attempt.id } });
    const row = await db.patientAssessmentSubmission.create({ data: { ...original, answers: original.answers ?? Prisma.JsonNull, id: randomUUID(), attemptNumber: original.attemptNumber + 1, resultSnapshot: snapshot, completionIdempotencyKey: randomUUID() } });
    return { ...row, who: attempt.who };
  }

  it('captures exact source and approved references as an unpublished immutable mapping', async () => {
    const v = await source(); const row = await mapping(v.id); const stored = await db.assessmentGuidanceVersion.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored).toMatchObject({ status: 'DRAFT', algorithmId: 'WEIGHTED_SUM', algorithmVersion: 1, questionnaireContentHash: v.contentHash, resultBandId: 'match' });
    expect((await read(await completed(v.id))).json()).toMatchObject({ status: 'NO_APPROVED_MAPPING', content: [], services: [], recommendConsultation: false });
  });
  it('delivers exact physician-approved education and visible services after real engine completion', async () => {
    const v = await source(); const row = await mapping(v.id); expect((await approve(row)).statusCode).toBe(201); const attempt = await completed(v.id); const r = await read(attempt);
    expect(r.statusCode).toBe(200); expect(r.json()).toMatchObject({ status: 'READY', mappingId: row.id, mappingVersion: 1, contentHash: row.contentHash, recommendConsultation: true });
    expect(r.json().content[0].id).toBe(guidanceId); expect(r.json().services[0].id).toBe(serviceId); expect(r.headers['cache-control']).toBe('private, no-store');
    for (const field of ['answers', 'score', 'approvedByUserId', 'approvedSessionId', 'completionPayloadHash', 'patientId']) expect(r.body).not.toContain(`"${field}"`);
    const event = await db.patientAccessAudit.findFirstOrThrow({ where: { resourceId: attempt.id, resourceType: 'ASSESSMENT_EDUCATIONAL_GUIDANCE' } }); expect(event.metadata).toEqual({ status: 'READY' });
  });
  it('keeps legacy algorithm provenance unrecorded without rewriting or rescoring historical results', async () => {
    const v = await source(); const row = await mapping(v.id); await approve(row); const attempt = await completed(v.id); const stored = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: attempt.id } });
    const snapshot = { ...(stored.resultSnapshot as Record<string, unknown>) }; delete snapshot.algorithmId; const legacy = await historical(attempt, snapshot as Prisma.InputJsonObject);
    const r = await read(legacy); expect(r.json()).toMatchObject({ status: 'PROVENANCE_UNRECORDED', content: [], services: [] }); expect((await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: legacy.id } })).resultSnapshot).toEqual(snapshot);
  });
  it('fails closed for unsupported algorithms, hashes and inconsistent bands', async () => {
    for (const patch of [{ algorithmId: 'UNKNOWN' }, { algorithmVersion: 2 }, { questionnaireContentHash: 'f'.repeat(64) }, { answerPayloadHash: 'f'.repeat(64) }, { resultBand: { id: 'match', title: 'Forged', riskLevel: 'NONE', requiresReview: false } }]) {
      const v = await source(); const attempt = await completed(v.id); const stored = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: attempt.id } });
      const imported = await historical(attempt, { ...(stored.resultSnapshot as Prisma.JsonObject), ...patch });
      expect((await read(imported)).json()).toMatchObject({ status: 'PROVENANCE_UNSUPPORTED', content: [], services: [], recommendConsultation: false });
    }
  });
  it('blocks automatic guidance when the source result requires individual clinical review', async () => {
    const v = await source(true); const row = await mapping(v.id); await approve(row); expect((await read(await completed(v.id))).json()).toMatchObject({ status: 'CLINICAL_REVIEW_REQUIRED', content: [], services: [] });
  });
  it('conceals other patients, noncomplete/invalidated and foreign clinic submissions', async () => {
    const v = await source(); const attempt = await completed(v.id); const outsider = await actor('PATIENT'); expect((await req('GET', `assessment-submissions/${attempt.id}/guidance`, outsider)).statusCode).toBe(404);
    await db.patientAssessmentSubmission.update({ where: { id: attempt.id }, data: { state: 'INVALIDATED', invalidatedAt: new Date() } }); expect((await read(attempt)).statusCode).toBe(404);
    const p = await actor('PATIENT'); const profile = await db.patientProfile.findUniqueOrThrow({ where: { userId: p.userId } }); const pending = await db.patientAssessmentSubmission.create({ data: { patientId: profile.id, assessmentVersionId: v.id } }); expect((await read({ id: pending.id, who: p })).statusCode).toBe(404);
    const foreignClinic = await db.clinic.create({ data: { name: 'Synthetic foreign', status: 'INACTIVE' } }); const foreign = await source(false, foreignClinic.id);
    const cross = await db.patientAssessmentSubmission.create({ data: { patientId: profile.id, assessmentVersionId: foreign.id } }); expect((await read({ id: cross.id, who: p })).statusCode).toBe(404);
    expect((await req('GET', `assessment-submissions/${attempt.id}/guidance`, admin)).statusCode).toBe(403);
  });
  it('preserves exact historical guidance for a retired questionnaire without switching version', async () => {
    const v = await source(); const row = await mapping(v.id); await approve(row); const attempt = await completed(v.id); await db.assessmentVersion.update({ where: { id: v.id }, data: { status: 'RETIRED', retiredAt: new Date() } });
    expect((await read(attempt)).json()).toMatchObject({ status: 'READY', assessmentVersionId: v.id, mappingId: row.id });
  });
  it('does not let an unapproved draft shadow approval and never falls back after newest approval revocation', async () => {
    const v = await source(); const first = await mapping(v.id); await approve(first); const second = await mapping(v.id); const attempt = await completed(v.id);
    expect((await read(attempt)).json().mappingId).toBe(first.id); await approve(second); expect((await read(attempt)).json().mappingId).toBe(second.id);
    expect((await req('POST', `clinical/assessment-guidance/${second.id}/revoke`, doctor)).statusCode).toBe(201); expect((await read(attempt)).json()).toMatchObject({ status: 'MAPPING_REVOKED', mappingId: second.id, content: [] });
    const third = await mapping(v.id); await approve(third); expect((await read(attempt)).json()).toMatchObject({ status: 'READY', mappingId: third.id });
  });
  it('suppresses the entire bundle after referenced content revocation and rejects approval with stale dependencies', async () => {
    const content = await guidance(); const v = await source(); const published = await mapping(v.id, content.id); await approve(published); const draft = await mapping(v.id, content.id); const attempt = await completed(v.id);
    expect((await req('POST', `clinical/guidance-content/${content.id}/revoke`, doctor)).statusCode).toBe(201);
    expect((await read(attempt)).json()).toMatchObject({ status: 'DEPENDENCIES_UNAVAILABLE', content: [], services: [] }); expect((await approve(draft)).statusCode).toBe(409);
  });
  it('suppresses semantic service changes and directory withdrawal but does not promise or freeze tariffs', async () => {
    const s = await service(); const v = await source(); const row = await mapping(v.id, guidanceId, [s.id]); await approve(row); const attempt = await completed(v.id);
    await db.doctorService.updateMany({ where: { serviceId: s.id }, data: { priceAmount: 200000 } }); expect((await read(attempt)).json().status).toBe('READY');
    await db.service.update({ where: { id: s.id }, data: { description: 'Changed semantics' } }); expect((await read(attempt)).json().status).toBe('DEPENDENCIES_UNAVAILABLE');
    await db.service.update({ where: { id: s.id }, data: { description: s.description } }); expect((await read(attempt)).json().status).toBe('READY');
    await db.doctorService.updateMany({ where: { serviceId: s.id }, data: { isActive: false } }); expect((await read(attempt)).json().status).toBe('DEPENDENCIES_UNAVAILABLE');
  });
  it('requires currently qualified mapping reviewer and approving content reviewer', async () => {
    const reviewer = await actor('DOCTOR'); const content = await guidance(reviewer); const v = await source(); const row = await mapping(v.id, content.id); await approve(row); const attempt = await completed(v.id);
    await db.clinicalClinicAccess.delete({ where: { userId_clinicId: { userId: reviewer.userId, clinicId } } }); expect((await read(attempt)).json().status).toBe('DEPENDENCIES_UNAVAILABLE');
    await db.clinicalClinicAccess.create({ data: { userId: reviewer.userId, clinicId } }); expect((await read(attempt)).json().status).toBe('READY');
    await db.clinicalRolePermission.delete({ where: { roleId_permission: { roleId, permission: 'CLINICAL_RECORD_SIGN' } } });
    try { expect((await read(attempt)).json().status).toBe('DEPENDENCIES_UNAVAILABLE'); } finally { await grant(); }
  });
  it('validates strict metadata, exact band, unique bounded refs and actual approved dependencies', async () => {
    const v = await source(); const unapproved = await guidance(doctor, false);
    for (const patch of [{ resultBandId: 'missing' }, { guidanceContentIds: [] }, { guidanceContentIds: [guidanceId, guidanceId.toUpperCase()] }, { guidanceContentIds: [unapproved.id] }, { guidanceContentIds: [randomUUID()] }, { serviceIds: [randomUUID()] }, { algorithmId: 'INVENTED' }, { recommendConsultation: 'false' }, { serviceIds: Array(11).fill(serviceId) }]) {
      const r = await req('POST', 'admin/assessment-guidance/versions', admin, { ...body(v.id), ...patch }); expect([400, 422]).toContain(r.statusCode);
    }
    expect((await req('POST', 'admin/assessment-guidance/versions', admin, body(v.id), null)).statusCode).toBe(422);
    const other = await db.clinic.create({ data: { name: 'Synthetic scope', status: 'INACTIVE' } }); const foreign = await source(false, other.id); expect((await req('POST', 'admin/assessment-guidance/versions', admin, body(foreign.id))).statusCode).toBe(404);
  });
  it('enforces author and physician clinic/live-role permissions on every API family', async () => {
    const v = await source(); const row = await mapping(v.id); const p = await actor('PATIENT');
    for (const who of [p, doctor, await actor('ADMIN', false), await actor('ADMIN', true, false)]) for (const [method, path, payload] of [['GET', 'admin/assessment-guidance', undefined], ['GET', `admin/assessment-guidance/${row.id}`, undefined], ['POST', 'admin/assessment-guidance/versions', body(v.id)], ['POST', `admin/assessment-guidance/${row.id}/revoke`, undefined]] as const) expect((await req(method, path, who, payload)).statusCode).toBe(403);
    for (const who of [admin, p, await actor('DOCTOR', false), await actor('DOCTOR', true, false)]) for (const [method, path, payload] of [['GET', 'clinical/assessment-guidance', undefined], ['GET', `clinical/assessment-guidance/${row.id}`, undefined], ['POST', `clinical/assessment-guidance/${row.id}/approve`, attestation(row)], ['POST', `clinical/assessment-guidance/${row.id}/revoke`, undefined]] as const) expect((await req(method, path, who, payload)).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/v1/admin/assessment-guidance' })).statusCode).toBe(401);
  });
  it('serializes equivalent command retries and distinct consecutive versions', async () => {
    const v = await source(); const key = randomUUID(); const payload = body(v.id); const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => req('POST', 'admin/assessment-guidance/versions', admin, i % 2 ? payload : Object.fromEntries(Object.entries(payload).reverse()), key)));
    expect(rs.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r => r.json().id)).size).toBe(1);
    expect((await req('POST', 'admin/assessment-guidance/versions', admin, { ...payload, recommendConsultation: false }, key)).statusCode).toBe(409);
    const versions = await Promise.all(Array.from({ length: 8 }, () => req('POST', 'admin/assessment-guidance/versions', admin, payload))); expect(versions.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(versions.map(r => r.json().versionNumber).sort((a,b) => a-b)).toEqual([2,3,4,5,6,7,8,9]);
  });
  it('binds explicit physician approval to exact hash, serializes retries and preserves final revocation', async () => {
    const v = await source(); const row = await mapping(v.id);
    expect((await req('POST', `clinical/assessment-guidance/${row.id}/approve`, doctor, { ...attestation(row), contentHash: 'f'.repeat(64) })).statusCode).toBe(409); expect((await req('POST', `clinical/assessment-guidance/${row.id}/approve`, doctor, { ...attestation(row), educationalOnly: false })).statusCode).toBe(400);
    const rs = await Promise.all(Array.from({ length: 8 }, () => approve(row))); expect(rs.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect(new Set(rs.map(r => r.json().approvedAt)).size).toBe(1); expect(await db.auditEvent.count({ where: { subjectId: row.id, action: 'ASSESSMENT_GUIDANCE_APPROVED' } })).toBe(1);
    expect((await req('POST', `admin/assessment-guidance/${row.id}/revoke`)).statusCode).toBe(403); const withdrawn = await Promise.all(Array.from({ length: 8 }, () => req('POST', `clinical/assessment-guidance/${row.id}/revoke`, doctor))); expect(withdrawn.map(r => r.statusCode)).toEqual(Array(8).fill(201)); expect((await approve(row)).statusCode).toBe(409);
    const draft = await mapping(v.id); expect((await req('POST', `admin/assessment-guidance/${draft.id}/revoke`)).statusCode).toBe(201); expect((await approve(draft)).statusCode).toBe(409);
  });
  it('serializes publication versus withdrawal and exposes bounded deterministic history', async () => {
    const v = await source(); const row = await mapping(v.id); const rs = await Promise.all([approve(row), req('POST', `clinical/assessment-guidance/${row.id}/revoke`, doctor)]); expect([201,409]).toContain(rs[0].statusCode); expect(rs[1].statusCode).toBe(201);
    await mapping(v.id); await mapping(v.id);
    for (const [prefix, who] of [['admin',admin],['clinical',doctor]] as const) { const r = await req('GET', `${prefix}/assessment-guidance?assessmentVersionId=${v.id}&pageSize=2`, who); expect(r.json().items).toHaveLength(2); expect(r.json().total).toBe(3); expect((await req('GET', `${prefix}/assessment-guidance?pageSize=51`, who)).statusCode).toBe(400); }
  });
  it('database retains immutable source/reference/evidence and rejects forged approval/version gaps', async () => {
    const v = await source(); const row = await mapping(v.id); const stored = await db.assessmentGuidanceVersion.findUniqueOrThrow({ where: { id: row.id } });
    await expect(db.assessmentGuidanceVersion.update({ where: { id: row.id }, data: { recommendConsultation: false } })).rejects.toThrow(/immutable/); await expect(db.assessmentGuidanceVersion.delete({ where: { id: row.id } })).rejects.toThrow(/retained/);
    const doctorId = (await db.doctorProfile.findUniqueOrThrow({ where: { userId: doctor.userId } })).id;
    await expect(db.assessmentGuidanceVersion.update({ where: { id: row.id }, data: { status: 'APPROVED', approvedByUserId: admin.userId, approvedDoctorId: doctorId, approvedSessionId: admin.sessionId, approvedAt: new Date(Date.now()+1000) } })).rejects.toThrow(/Qualified/);
    await expect(db.assessmentGuidanceVersion.create({ data: { ...stored, contentReferences: stored.contentReferences!, serviceReferences: stored.serviceReferences!, resultBandSnapshot: stored.resultBandSnapshot!, id: randomUUID(), versionNumber: 8, idempotencyKey: randomUUID() } })).rejects.toThrow(/consecutive/);
  });
  it('rolls back writes and denies metadata/clinical reads when audit persistence fails', async () => {
    const author = await actor('ADMIN'), reviewer = await actor('DOCTOR'), who = await actor('PATIENT'); const v = await source(); const draft = await mapping(v.id); const published = await mapping(v.id); await approve(published); const attempt = await completed(v.id, who);
    for (const a of [author,reviewer,who]) if (!/^[a-f0-9-]{36}$/.test(a.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION mapping_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id IN ('${author.userId}'::uuid,'${reviewer.userId}'::uuid) THEN RAISE EXCEPTION 'synthetic mapping audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER mapping_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION mapping_test_audit_fail()`);
    await db.$executeRawUnsafe(`CREATE FUNCTION mapping_test_clinical_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${who.userId}'::uuid THEN RAISE EXCEPTION 'synthetic clinical audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER mapping_test_clinical_audit_fail BEFORE INSERT ON patient_access_audits FOR EACH ROW EXECUTE FUNCTION mapping_test_clinical_audit_fail()`);
    const target = await source();
    try {
      for (const [method,path,actor,payload] of [['POST','admin/assessment-guidance/versions',author,body(target.id)],['POST',`clinical/assessment-guidance/${draft.id}/approve`,reviewer,attestation(draft)],['POST',`clinical/assessment-guidance/${published.id}/revoke`,reviewer,undefined],['GET','admin/assessment-guidance',author,undefined],['GET',`clinical/assessment-guidance/${draft.id}`,reviewer,undefined]] as const) { const r = await req(method,path,actor,payload); expect(r.statusCode).toBe(500); expect(r.body).not.toContain('synthetic'); }
      const r = await read(attempt); expect(r.statusCode).toBe(503); expect(r.json().code).toBe('CLINICAL_AUDIT_UNAVAILABLE'); expect(r.body).not.toContain('Synthetic education');
      expect(await db.assessmentGuidanceVersion.count({ where: { assessmentVersionId: target.id } })).toBe(0); expect((await db.assessmentGuidanceVersion.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('DRAFT'); expect((await db.assessmentGuidanceVersion.findUniqueOrThrow({ where: { id: published.id } })).status).toBe('APPROVED');
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER mapping_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION mapping_test_audit_fail()`); await db.$executeRaw(Prisma.sql`DROP TRIGGER mapping_test_clinical_audit_fail ON patient_access_audits`); await db.$executeRaw(Prisma.sql`DROP FUNCTION mapping_test_clinical_audit_fail()`); }
  });
});

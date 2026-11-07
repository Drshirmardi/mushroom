import { createHash, randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { ProgramCatalogBundle, type CatalogBundle, type CatalogEntry } from '../src/modules/programs/catalog/program-catalog.bundle';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('program catalog and working drafts (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication, db: PrismaService, clinicId: string;
  let admin: Awaited<ReturnType<typeof actor>>, entry: CatalogEntry, bundle: CatalogBundle;
  beforeAll(async () => {
    assertPatientJourneyTestDatabase(); Logger.overrideLogger(false);
    app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
  }, 30000);
  afterAll(async () => { await app?.close(); });
  afterEach(() => vi.restoreAllMocks());
  async function actor(role: 'ADMIN' | 'PATIENT' = 'ADMIN', membership = true) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } });
    if (membership && role === 'ADMIN') await db.clinicalClinicAccess.create({ data: { userId: auth.userId, clinicId } });
    return auth;
  }
  function updateBundle() { bundle.hash = createHash('sha256').update(JSON.stringify(bundle.entries)).digest('hex'); }
  beforeEach(async () => {
    admin = await actor();
    entry = { programKey: 'CAT_' + randomUUID().replaceAll('-', '').toUpperCase(), locale: 'fa-IR', kind: 'READY_EDUCATION', baseAmountRial: '2050000', reviewRequired: true,
      draft: { title: 'Synthetic service', body: 'Synthetic private Markdown curriculum', category: 'Synthetic category ' + randomUUID(), audience: 'SHARED', pairs: ['damavi/damavi'] }, sources: [{ path: 'markdown/synthetic.md', sha256: '1'.repeat(64), quality: 'unreviewed' }] };
    bundle = { schemaVersion: 1, hash: '', entries: [entry] }; updateBundle();
    vi.spyOn(app.get(ProgramCatalogBundle), 'load').mockImplementation(async () => structuredClone(bundle));
  });
  const key = () => `${entry.programKey}:${entry.locale}`;
  const request = (method: 'GET' | 'POST', path: string, payload?: object, who = admin) => app.inject({ method, url: '/v1/admin/' + path,
    headers: { authorization: 'Bearer ' + who.token, origin: 'http://localhost:3000', ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  async function preview() { const r = await request('POST', 'program-catalog/preview', { entries: [key()] }); expect(r.statusCode, r.body).toBe(201); return r.json(); }
  async function apply(id: string, resolutions?: { field: string; choice: string }[]) { const r = await request('POST', `program-catalog/${id}/apply`, { items: [{ key: key(), ...(resolutions ? { resolutions } : {}) }] }); expect(r.statusCode, r.body).toBe(201); return r.json().items[0]; }
  async function imported() { const result = await apply((await preview()).id); expect(result.state).toBe('APPLIED'); return db.programService.findUniqueOrThrow({ where: { id: result.serviceId } }); }

  it('imports incomplete data without invented safety, immutable definition, sale or patient content exposure', async () => {
    const list = await request('GET', 'program-catalog'); expect(list.statusCode).toBe(200); expect(list.body).not.toContain(String(entry.draft.body));
    const row = await imported(); expect(row).toMatchObject({ baseAmountRial: 2050000n, discountPercent: 0, audience: 'SHARED', publishedDefinitionId: null, sellingEnabled: false });
    expect(row.draft).not.toHaveProperty('safety');
    expect((await request('POST', `program-services/${row.id}/submit`, { expectedRevision: row.revision })).statusCode).toBe(422);
    expect(await db.programDefinitionVersion.count({ where: { clinicId, programKey: entry.programKey } })).toBe(0);
    const patient = await actor('PATIENT'); expect((await request('GET', 'program-catalog', undefined, patient)).statusCode).toBe(403);
    expect((await request('GET', `program-services/${row.id}`, undefined, patient)).statusCode).toBe(403);
  });
  it('saves an incomplete manual working draft and rejects stale, privileged or unrecognized fields', async () => {
    const create = await request('POST', 'program-services', { programKey: entry.programKey, locale: entry.locale, draft: { title: 'Only a title' } }); expect(create.statusCode, create.body).toBe(201);
    const row = create.json(); expect(row.draft).toEqual({ title: 'Only a title' });
    const save = await request('POST', `program-services/${row.id}/draft`, { expectedRevision: row.revision, draft: { title: 'Edited' } }); expect(save.statusCode, save.body).toBe(201);
    expect((await request('POST', `program-services/${row.id}/draft`, { expectedRevision: row.revision, draft: { title: 'Stale edit' } })).statusCode).toBe(409);
    expect((await request('POST', `program-services/${row.id}/draft`, { expectedRevision: save.json().revision, draft: { status: 'APPROVED' } })).statusCode).toBe(400);
    expect((await request('POST', 'program-services', { programKey: entry.programKey, locale: entry.locale, draft: {}, clinicId })).statusCode).toBe(400);
  });
  it('lets a same-clinic administrator prepare a ready service without a physician, idempotently', async () => {
    const row = await imported();
    const saved = await request('POST', `program-services/${row.id}/draft`, { expectedRevision: row.revision, draft: {
      ...entry.draft, summary: 'Synthetic summary', eligibilityDescription: 'Synthetic eligibility',
      safety: { intendedAudience: 'Synthetic audience', limitations: 'Synthetic limits', contraindications: [], seekProfessionalCare: 'Synthetic professional care instruction' },
    } }); expect(saved.statusCode, saved.body).toBe(201);
    const r = await request('POST', `program-services/${row.id}/submit`, { expectedRevision: saved.json().revision }); expect(r.statusCode, r.body).toBe(201);
    expect(r.json()).toMatchObject({ programKey: row.programKey, status: 'APPROVED', usable: true });
    expect(await db.programDefinitionVersion.findUniqueOrThrow({ where: { id: r.json().id } })).toMatchObject({ approvedByUserId: admin.userId, approvedDoctorId: null });
    expect((await request('POST', `program-services/${row.id}/submit`, { expectedRevision: saved.json().revision })).json().id).toBe(r.json().id);
    expect(await db.programDefinitionVersion.count({ where: { clinicId, programKey: row.programKey } })).toBe(1);
    expect(await db.programService.count({ where: { clinicId, programKey: row.programKey } })).toBe(1);
    expect(await db.programService.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({ publishedDefinitionId: null, sellingEnabled: false });
    const preview = await request('POST', 'program-offerings/preview', { programDefinitionId: r.json().id, amountRial: '2500000', currency: 'IRR', accessMode: 'PERPETUAL', quoteTtlSeconds: 1800 });
    expect(preview.statusCode, preview.body).toBe(200);
    expect(preview.json()).toMatchObject({ configurationReady: true, blockers: [] });
    const published = await app.inject({ method: 'POST', url: '/v1/admin/program-offerings', headers: { authorization: 'Bearer ' + admin.token, origin: 'http://localhost:3000', 'idempotency-key': randomUUID() }, payload: { ...preview.json().configuration, publicationHash: preview.json().publicationHash, expectedPublicationNumber: 0, reviewedTermsAndRetention: true } });
    expect(published.statusCode, published.body).toBe(201);
    expect(published.json()).toMatchObject({ configurationReady: true });
  });
  it('detects edits after Preview, and replays an applied item without overwriting subsequent edits', async () => {
    const row = await imported(), stale = await preview();
    await db.programService.update({ where: { id: row.id }, data: { draft: JSON.parse(JSON.stringify({ ...entry.draft, title: 'Manual title' })), revision: { increment: 1 } } });
    expect((await apply(stale.id)).state).toBe('CONFLICT');
    const fresh = await preview(), result = await apply(fresh.id);
    expect(result.state).toBe('UNCHANGED');
    await db.programService.update({ where: { id: row.id }, data: { draft: JSON.parse(JSON.stringify({ ...entry.draft, title: 'Later edit' })), revision: { increment: 1 } } });
    expect(await apply(fresh.id)).toEqual(result);
    expect((await db.programService.findUniqueOrThrow({ where: { id: row.id } })).draft).toMatchObject({ title: 'Later edit' });
    expect((await apply(fresh.id, [{ field: 'title', choice: 'SOURCE' }])).state).toBe('CONFLICT');
  });
  it('requires explicit conflict resolution and preserves price, discounts and administrative classification', async () => {
    const row = await imported();
    await db.programService.update({ where: { id: row.id }, data: { draft: JSON.parse(JSON.stringify({ ...entry.draft, body: 'Manual body', category: 'Manual category' })), audience: 'FEMALE', baseAmountRial: 9990000n, discountPercent: 20, revision: { increment: 1 } } });
    entry.draft.body = 'Changed source body'; entry.draft.category = 'Changed source category'; entry.draft.audience = 'MALE'; entry.baseAmountRial = '3000000'; updateBundle();
    const p = await preview(); expect(p.items[0]).toMatchObject({ state: 'CONFLICT', conflicts: ['body'] });
    expect((await apply(p.id)).state).toBe('CONFLICT');
    expect((await apply(p.id, [{ field: 'body', choice: 'SOURCE' }])).state).toBe('APPLIED');
    expect(await db.programService.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({ draft: { body: 'Changed source body', category: 'Manual category' }, audience: 'FEMALE', baseAmountRial: 9990000n, discountPercent: 20, sellingEnabled: false });
  });
  it('never resurrects archived services and keeps restoration paused', async () => {
    const row = await imported(), stale = await preview();
    const archived = await request('POST', `program-services/${row.id}/archive`, { expectedRevision: row.revision }); expect(archived.statusCode, archived.body).toBe(201);
    expect((await apply(stale.id)).state).toBe('CONFLICT');
    const p = await preview(); expect(p.items[0].state).toBe('ARCHIVED'); expect((await apply(p.id)).state).toBe('SKIPPED');
    const restored = await request('POST', `program-services/${row.id}/restore`, { expectedRevision: archived.json().revision }); expect(restored.json()).toMatchObject({ archivedAt: null, sellingEnabled: false });
  });
  it('applies one receipt for concurrent retries and rejects changed bundle or expired preview', async () => {
    const p = await preview(); const results = await Promise.all([apply(p.id), apply(p.id), apply(p.id)]);
    expect(new Set(results.map(r => r.serviceId)).size).toBe(1);
    expect(await db.programImportReceipt.count({ where: { previewId: p.id } })).toBe(1);
    const stale = await preview(); entry.draft.body = 'New bundle body'; updateBundle(); expect((await apply(stale.id)).state).toBe('CONFLICT');
    const expired = await preview(); await db.programImportPreview.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } }); expect((await apply(expired.id)).state).toBe('CONFLICT');
  });
  it('requires active same-clinic authority and actor-owned previews', async () => {
    const p = await preview(), other = await actor(), unscoped = await actor('ADMIN', false);
    expect((await request('GET', 'program-services', undefined, unscoped)).statusCode).toBe(403);
    expect((await request('POST', `program-catalog/${p.id}/apply`, { items: [{ key: key() }] }, other)).statusCode).toBe(404);
    const foreign = await db.clinic.create({ data: { name: 'Foreign catalog clinic', status: 'INACTIVE', timeZone: 'Asia/Tehran' } });
    const hidden = await db.programService.create({ data: { clinicId: foreign.id, programKey: entry.programKey, locale: entry.locale } });
    expect((await request('GET', `program-services/${hidden.id}`)).statusCode).toBe(404);
  });
  it('keeps valid entries usable when a source is invalid', async () => {
    bundle.entries.push({ ...entry, programKey: 'BAD_' + randomUUID().replaceAll('-', '').toUpperCase(), invalidReason: 'Invalid source metadata' }); updateBundle();
    const r = await request('POST', 'program-catalog/preview', { entries: bundle.entries.map(e => `${e.programKey}:${e.locale}`) }); expect(r.statusCode, r.body).toBe(201);
    expect(r.json().items.map((i: { state: string }) => i.state)).toEqual(['NEW', 'INVALID']);
    expect((await apply(r.json().id)).state).toBe('APPLIED');
  });
  it('rolls back service, category and receipt together when audit fails', async () => {
    const p = await preview();
    await db.$executeRawUnsafe("CREATE FUNCTION program_import_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='PROGRAM_SERVICE_IMPORTED' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER program_import_test_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION program_import_test_fail()');
    try {
      const r = await request('POST', `program-catalog/${p.id}/apply`, { items: [{ key: key() }] }); expect(r.statusCode).toBe(500);
      expect(await db.programService.count({ where: { clinicId, programKey: entry.programKey } })).toBe(0);
      expect(await db.programServiceCategory.count({ where: { clinicId, name: String(entry.draft.category) } })).toBe(0);
      expect(await db.programImportReceipt.count({ where: { previewId: p.id } })).toBe(0);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER program_import_test_fail ON audit_events'); await db.$executeRawUnsafe('DROP FUNCTION program_import_test_fail()'); }
    expect((await apply(p.id)).state).toBe('APPLIED');
  });
  it('requires reassignment to deactivate a used category and does not deadlock with concurrent edits', async () => {
    const row = await imported(), source = await db.programServiceCategory.findUniqueOrThrow({ where: { id: row.categoryId! } });
    const targetResponse = await request('POST', 'program-categories', { key: randomUUID(), name: 'Replacement category' }); expect(targetResponse.statusCode, targetResponse.body).toBe(201);
    const target = targetResponse.json();
    expect((await request('POST', `program-categories/${source.id}`, { expectedRevision: source.revision, name: source.name, active: false })).statusCode).toBe(409);
    const results = await Promise.all([
      request('POST', `program-services/${row.id}/draft`, { expectedRevision: row.revision, draft: { ...entry.draft, title: 'Concurrent title' } }),
      request('POST', `program-categories/${source.id}`, { expectedRevision: source.revision, name: source.name, active: false, reassignToId: target.id }),
    ]);
    expect(results.every(r => [201, 409].includes(r.statusCode)), results.map(r => r.body).join('\n')).toBe(true);
    expect((await db.programService.findUniqueOrThrow({ where: { id: row.id } })).categoryId).toBe(target.id);
  });
});

import { createCompleteTestPatient, clearTestPatientEntries } from './patient-entry-test-support';
import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AdminCommerceCatalogService } from '../src/modules/commerce/catalog/admin-commerce-catalog.service';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PRODUCT_MEDIA_TEST_ISOLATED !== '1')('Product Details B1A (isolated PostgreSQL API)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let clinicId: string; let categoryId: string;
  let admin: Awaited<ReturnType<typeof createTestAccessToken>>;
  let staff: Awaited<ReturnType<typeof createTestAccessToken>>;
  let patient: Awaited<ReturnType<typeof createTestAccessToken>>;
  const products = new Set<string>(); const foreignClinics = new Set<string>(); const foreignCategories = new Set<string>();
  const provenance = { sourceKind: 'PACKAGING', sourceReference: 'Disposable fixture label, reviewed for this test' };
  const headers = (token = admin.token) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });
  const path = (id: string) => `/v1/admin/commerce/products/${id}/content`;
  const call = (method: 'GET' | 'PATCH' | 'POST', id: string, payload?: object, token = admin.token) => app.inject({ method, url: path(id) + (method === 'POST' ? '/approve' : ''), headers: headers(token), payload });
  const save = (id: string, revision: number, fields: object, extra: object = {}) => call('PATCH', id, { expectedContentRevision: revision, fields, ...extra });
  const approve = (id: string, revision: number) => call('POST', id, { expectedContentRevision: revision });
  async function create(content: object = { fields: { description: 'Fixture description', brand: 'Fixture brand' }, provenance }) {
    const response = await app.inject({ method: 'POST', url: '/v1/admin/commerce/products', headers: headers(), payload: { categoryId, title: 'Disposable content product', slug: `pd-${randomUUID()}`, content } });
    expect(response.statusCode).toBe(201);
    const id = response.json().id as string; products.add(id); return response.json() as { id: string; content: { contentRevision: number; status: string } };
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (process.env.NODE_ENV !== 'test' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/product_media_test') throw new Error('Content tests require the explicitly enabled disposable product_media_test database.');
    Logger.overrideLogger(false);
    app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService);
    const tokens = app.get(AccessTokenService);
    admin = await createTestAccessToken(prisma, tokens, ['ADMIN']); staff = await createTestAccessToken(prisma, tokens, ['STAFF']); patient = await createTestAccessToken(prisma, tokens, ['PATIENT']);
    clinicId = (await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
    categoryId = (await prisma.commerceCategory.create({ data: { clinicId, name: 'Disposable content category', slug: `pd-${randomUUID()}` } })).id;
    await createCompleteTestPatient(prisma, { data: { userId: patient.userId, clinicId } });
  }, 30_000);
  afterEach(async () => {
    if (!prisma) return;
    const ids = [...products];
    const skus = await prisma.commerceSku.findMany({ where: { productId: { in: ids } }, select: { id: true } });
    const skuIds = skus.map((sku) => sku.id);
    await prisma.auditEvent.deleteMany({ where: { subjectId: { in: ids } } });
    await prisma.commerceCartItem.deleteMany({ where: { skuId: { in: skuIds } } });
    await prisma.wishlistItem.deleteMany({ where: { skuId: { in: skuIds } } });
    await prisma.commerceProductImage.deleteMany({ where: { productId: { in: ids } } });
    await prisma.inventoryItem.deleteMany({ where: { skuId: { in: skuIds } } });
    await prisma.commerceSku.deleteMany({ where: { id: { in: skuIds } } });
    await prisma.commerceProduct.deleteMany({ where: { id: { in: ids } } });
    await prisma.commerceCategory.deleteMany({ where: { id: { in: [...foreignCategories] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [...foreignClinics] } } });
    products.clear(); foreignCategories.clear(); foreignClinics.clear();
  });
  afterAll(async () => {
    if (prisma) {
      const profile = await prisma.patientProfile.findUnique({ where: { userId: patient.userId } });
      if (profile) { await prisma.commerceCart.deleteMany({ where: { patientId: profile.id } }); await clearTestPatientEntries(prisma, { id: profile.id }); await prisma.patientProfile.delete({ where: { id: profile.id } }); }
      await prisma.commerceCategory.delete({ where: { id: categoryId } });
      for (const principal of [admin, staff, patient]) { await prisma.auditEvent.deleteMany({ where: { actorUserId: principal.userId } }); await prisma.session.deleteMany({ where: { userId: principal.userId } }); await prisma.user.delete({ where: { id: principal.userId } }); }
    }
    await app?.close();
  });

  it('creates optional empty content without inventing source or approval and rejects empty approval', async () => {
    const product = await create({});
    expect(product.content).toMatchObject({ contentRevision: 0, status: 'PENDING_APPROVAL', brand: null, description: null, provenance: null, approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null });
    const result = await approve(product.id, 0); expect(result.statusCode).toBe(422); expect(result.json().code).toBe('COMMERCE_CONTENT_INVALID');
  });
  it('normalizes all controlled fields, preserves paragraphs, approves exact revision and deduplicates replay', async () => {
    const product = await create({ fields: { brand: '  ＡＣＭＥ  ', manufacturer: '  سازنده  ', shortDescription: ' مختصر ', description: '  line one\n\nline two  ', ingredients: ' ماده ', usageInstructions: ' روش ', warnings: ' هشدار ', contraindications: ' منع ' }, provenance });
    const draft = await call('GET', product.id);
    expect(draft.statusCode).toBe(200); expect(draft.headers['cache-control']).toBe('no-store');
    expect(draft.json()).toMatchObject({ brand: 'ACME', manufacturer: 'سازنده', shortDescription: 'مختصر', description: 'line one\n\nline two', ingredients: 'ماده', usageInstructions: 'روش', warnings: 'هشدار', contraindications: 'منع', contentRevision: 1, status: 'PENDING_APPROVAL' });
    const results = await Promise.all([approve(product.id, 1), approve(product.id, 1)]);
    expect(results.map((result) => result.statusCode)).toEqual([200, 200]);
    expect(results[0].json()).toMatchObject({ status: 'APPROVED', approvedContentRevision: 1, contentApprovedByUserId: admin.userId });
    const events = await prisma.auditEvent.findMany({ where: { subjectId: product.id, action: 'COMMERCE_PRODUCT_CONTENT_APPROVED' } });
    expect(events).toHaveLength(1); expect(events[0].metadata).toMatchObject({ contentRevision: 1, contentDigest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(JSON.stringify(events[0].metadata)).not.toContain(provenance.sourceReference);
    expect(JSON.stringify(events[0].metadata)).not.toContain('line one');
  });
  it('distinguishes omission, normalized no-op and null; material edit invalidates all approval metadata', async () => {
    const product = await create(); await approve(product.id, 1);
    const noop = await save(product.id, 1, { brand: '  Fixture brand  ' });
    expect(noop.json()).toMatchObject({ contentRevision: 1, status: 'APPROVED', description: 'Fixture description' });
    const empty = await save(product.id, 1, {}); expect(empty.statusCode).toBe(422);
    const clear = await save(product.id, 1, { brand: null });
    expect(clear.json()).toMatchObject({ contentRevision: 2, brand: null, description: 'Fixture description', status: 'PENDING_APPROVAL', approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null });
    const stale = await save(product.id, 1, { description: 'stale' }); expect(stale.statusCode).toBe(409); expect(stale.json()).toMatchObject({ code: 'COMMERCE_CONTENT_REVISION_CONFLICT', details: { currentRevision: 2 } });
    expect((await prisma.commerceProduct.findUniqueOrThrow({ where: { id: product.id } })).description).toBe('Fixture description');
  });
  it('requires source, invalidates approval on provenance change/clear, and does not invalidate for unrelated product edits', async () => {
    const product = await create({ fields: { warnings: 'Source-supported fixture warning' } });
    const missing = await approve(product.id, 1); expect(missing.statusCode).toBe(422); expect(missing.json().code).toBe('COMMERCE_CONTENT_SOURCE_REQUIRED');
    await save(product.id, 1, {}, { provenance }); await approve(product.id, 2);
    const unrelated = await app.inject({ method: 'PATCH', url: `/v1/admin/commerce/products/${product.id}`, headers: headers(), payload: { title: 'New factual title', status: 'ACTIVE' } });
    expect(unrelated.json().content).toMatchObject({ status: 'APPROVED', contentRevision: 2 });
    const changed = await save(product.id, 2, {}, { provenance: { ...provenance, sourceReference: 'Replacement fixture source' } });
    expect(changed.json()).toMatchObject({ contentRevision: 3, status: 'PENDING_APPROVAL' });
    await approve(product.id, 3);
    const cleared = await save(product.id, 3, {}, { provenance: null });
    expect(cleared.json()).toMatchObject({ contentRevision: 4, provenance: null, status: 'PENDING_APPROVAL' });
  });
  it.each([
    { fields: null }, { fields: [] }, { fields: { brand: 42 } }, { fields: { invented: 'no' } },
    { fields: { approvedContentRevision: 1 } }, { provenance: {} }, { provenance: { sourceKind: 'FORGED', sourceReference: 'x' } },
    { provenance: { sourceKind: 'PACKAGING', sourceReference: null } }, { expectedContentRevision: null, fields: { brand: 'x' } },
    { expectedContentRevision: '1', fields: { brand: 'x' } }, { expectedContentRevision: -1, fields: { brand: 'x' } },
    { fields: { brand: 'x' }, contentApprovedByUserId: randomUUID() },
  ])('rejects malformed/forged nested input without changing content: %j', async (payload) => {
    const product = await create(); const result = await call('PATCH', product.id, { expectedContentRevision: 1, ...payload });
    expect(result.statusCode).toBe(400); expect(result.json().code).toBe('BAD_REQUEST');
    expect((await call('GET', product.id)).json().contentRevision).toBe(1);
  });
  it.each(['brand', 'manufacturer', 'shortDescription', 'description', 'ingredients', 'usageInstructions', 'warnings', 'contraindications'])('rejects whitespace and canonical oversize %s', async (key) => {
    const product = await create();
    expect((await save(product.id, 1, { [key]: ' \n ' })).statusCode).toBe(422);
    const limit = key === 'brand' || key === 'manufacturer' ? 240 : key === 'shortDescription' ? 500 : 5000;
    const result = await save(product.id, 1, { [key]: '\uFB03'.repeat(Math.floor(limit / 3) + 1) });
    expect(result.statusCode).toBe(422); expect(result.json().code).toBe('COMMERCE_CONTENT_INVALID');
  });
  it('rejects blank/oversized provenance and rejects duplicate description or forged ordinary product metadata', async () => {
    const product = await create();
    for (const sourceReference of [' ', 'x'.repeat(1001)]) expect((await save(product.id, 1, {}, { provenance: { ...provenance, sourceReference } })).statusCode).toBe(422);
    const duplicate = await app.inject({ method: 'PATCH', url: `/v1/admin/commerce/products/${product.id}`, headers: headers(), payload: { description: 'outer', content: { expectedContentRevision: 1, fields: { description: 'inner' } } } });
    expect(duplicate.statusCode).toBe(400);
    const forged = await app.inject({ method: 'PATCH', url: `/v1/admin/commerce/products/${product.id}`, headers: headers(), payload: { approvedContentRevision: 1, contentApprovedByUserId: admin.userId } });
    expect(forged.statusCode).toBe(400);
    const approvalForgery = await call('POST', product.id, { expectedContentRevision: 1, contentApprovedAt: new Date().toISOString() });
    expect(approvalForgery.statusCode).toBe(400);
  });
  it('enforces raw UTF-8 request limit, including JSON whitespace, with stable 413 errors', async () => {
    const product = await create();
    const payload = `${' '.repeat(128 * 1024)}${JSON.stringify({ expectedContentRevision: 1, fields: { brand: 'small' } })}`;
    const response = await app.inject({ method: 'PATCH', url: path(product.id), headers: { ...headers(), 'content-type': 'application/json' }, payload });
    expect(response.statusCode).toBe(413); expect(response.json().code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('requires authentication, ADMIN/permission and clinic ownership for read/save/approve, including service approval', async () => {
    const product = await create();
    for (const method of ['GET', 'PATCH', 'POST'] as const) {
      const payload = method === 'GET' ? undefined : { expectedContentRevision: 1, ...(method === 'PATCH' ? { fields: { brand: 'changed' } } : {}) };
      expect((await call(method, product.id, payload, staff.token)).statusCode).toBe(403);
      expect((await call(method, product.id, payload, patient.token)).statusCode).toBe(403);
      expect((await app.inject({ method, url: path(product.id) + (method === 'POST' ? '/approve' : ''), payload })).statusCode).toBe(401);
    }
    const foreign = await prisma.clinic.create({ data: { name: 'Inactive isolated foreign clinic', status: 'INACTIVE' } }); foreignClinics.add(foreign.id);
    const category = await prisma.commerceCategory.create({ data: { clinicId: foreign.id, name: 'foreign', slug: randomUUID() } }); foreignCategories.add(category.id);
    const foreignProduct = await prisma.commerceProduct.create({ data: { clinicId: foreign.id, categoryId: category.id, title: 'foreign fixture', slug: randomUUID() } }); products.add(foreignProduct.id);
    for (const method of ['GET', 'PATCH', 'POST'] as const) expect((await call(method, foreignProduct.id, method === 'GET' ? undefined : { expectedContentRevision: 0, ...(method === 'PATCH' ? { fields: { brand: 'x' } } : {}) })).statusCode).toBe(404);
    await expect(app.get(AdminCommerceCatalogService).approveContent(product.id, 1, { actorUserId: staff.userId, actorSessionId: staff.sessionId, requestId: 'fixture', ipAddress: '127.0.0.1' }, ['STAFF'])).rejects.toMatchObject({ response: { code: 'FORBIDDEN' } });
  });
  it('makes compatibility description writes and nested ordinary updates participate in revision and approval', async () => {
    const product = await create(); await approve(product.id, 1);
    const compatibility = await app.inject({ method: 'PATCH', url: `/v1/admin/commerce/products/${product.id}`, headers: headers(), payload: { description: ' old-client edit\n\nparagraph ' } });
    expect(compatibility.statusCode).toBe(200); expect(compatibility.json().content).toMatchObject({ contentRevision: 2, status: 'PENDING_APPROVAL', description: 'old-client edit\n\nparagraph' });
    const strict = await app.inject({ method: 'PATCH', url: `/v1/admin/commerce/products/${product.id}`, headers: headers(), payload: { content: { expectedContentRevision: 2, fields: { manufacturer: 'Verified fixture name' } } } });
    expect(strict.json().content).toMatchObject({ contentRevision: 3, manufacturer: 'Verified fixture name' });
    const stale = await app.inject({ method: 'PATCH', url: `/v1/admin/commerce/products/${product.id}`, headers: headers(), payload: { title: 'must roll back', content: { expectedContentRevision: 2, fields: { brand: 'stale' } } } });
    expect(stale.statusCode).toBe(409); expect((await prisma.commerceProduct.findUniqueOrThrow({ where: { id: product.id } })).title).toBe('Disposable content product');
  });
  it('serializes concurrent strict edits and edit-versus-approval without stale approval (real row locks)', async () => {
    const product = await create();
    const edits = await Promise.all([save(product.id, 1, { brand: 'one' }), save(product.id, 1, { brand: 'two' })]);
    expect(edits.map((result) => result.statusCode).sort()).toEqual([200, 409]);
    for (let round = 0; round < 6; round++) {
      const revision = (await prisma.commerceProduct.findUniqueOrThrow({ where: { id: product.id } })).contentRevision;
      const [edit, approval] = await Promise.all([save(product.id, revision, { brand: `race ${round}` }), approve(product.id, revision)]);
      expect(edit.statusCode).toBe(200); expect([200, 409]).toContain(approval.statusCode);
      const record = await prisma.commerceProduct.findUniqueOrThrow({ where: { id: product.id } });
      expect(record).toMatchObject({ contentRevision: revision + 1, approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null });
    }
  });
  it('rolls back content changes when their required audit cannot commit', async () => {
    const product = await create(); await approve(product.id, 1);
    const before = await prisma.commerceProduct.findUniqueOrThrow({ where: { id: product.id } });
    const auditsBefore = await prisma.auditEvent.count({ where: { subjectId: product.id } });
    await expect(app.get(AdminCommerceCatalogService).updateContent(product.id, { expectedContentRevision: 1, fields: { brand: 'must not persist' } }, { actorUserId: randomUUID(), actorSessionId: admin.sessionId, requestId: 'rollback-fixture', ipAddress: '127.0.0.1' })).rejects.toBeDefined();
    expect(await prisma.commerceProduct.findUniqueOrThrow({ where: { id: product.id } })).toEqual(before);
    expect(await prisma.auditEvent.count({ where: { subjectId: product.id } })).toBe(auditsBefore);
  });
  it('keeps legacy creation shape, explicit null fields and plain text compatible without implicit approval', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/admin/commerce/products', headers: headers(), payload: { categoryId, title: 'Old client fixture', slug: `pd-${randomUUID()}`, description: '  old client\n\ntext  ' } });
    expect(response.statusCode).toBe(201); products.add(response.json().id);
    expect(response.json().content).toMatchObject({ description: 'old client\n\ntext', contentRevision: 1, status: 'PENDING_APPROVAL', provenance: null });
    const product = await create({ fields: { description: '<script>literal fixture text</script>', brand: null }, provenance });
    expect((await call('GET', product.id)).json().description).toBe('<script>literal fixture text</script>');
    expect((await save(product.id, 1, { description: { html: '<script>not plain text</script>' } })).statusCode).toBe(400);
    const cleared = await save(product.id, 1, { description: null });
    expect(cleared.json()).toMatchObject({ description: null, contentRevision: 2, status: 'PENDING_APPROVAL' });
    expect((await approve(product.id, 2)).statusCode).toBe(422);
  });
  it('documents nullable/additive DTOs, strict approval requests and stable errors in OpenAPI', async () => {
    const document = (await app.inject({ method: 'GET', url: '/docs-json' })).json();
    const paths = document.paths; const schemas = document.components.schemas;
    expect(paths['/v1/admin/commerce/products/{productId}/content'].patch.operationId).toBe('adminProductContentUpdate');
    expect(paths['/v1/admin/commerce/products/{productId}/content'].get.responses['400']).toBeDefined();
    expect((await call('GET', 'not-a-uuid')).statusCode).toBe(400);
    const approval = paths['/v1/admin/commerce/products/{productId}/content/approve'].post;
    expect(approval.security).toEqual([{ bearerAuth: [] }]);
    for (const status of [200, 400, 401, 403, 404, 409, 413, 422]) expect(approval.responses[String(status)]).toBeDefined();
    expect(schemas.ApproveProductContentDto.required).toEqual(['expectedContentRevision']);
    expect(Object.keys(schemas.ApproveProductContentDto.properties)).toEqual(['expectedContentRevision']);
    expect(schemas.ProductContentFieldsDto.properties.brand).toMatchObject({ nullable: true, maxLength: 240 });
    expect(schemas.PatientCommerceProductDto.required).not.toContain('content');
    expect(schemas.PatientCommerceProductDto.properties.content.nullable).toBe(true);
    expect(schemas.PublicProductContentDto.properties.provenance).toBeUndefined();
    expect(schemas.PublicProductContentDto.properties.contentApprovedByUserId).toBeUndefined();
    expect(schemas.ApiErrorResponseDto.properties.code.enum).toEqual(expect.arrayContaining(['COMMERCE_CONTENT_INVALID', 'COMMERCE_CONTENT_REVISION_CONFLICT', 'COMMERCE_CONTENT_SOURCE_REQUIRED']));
  });
  it('projects approved/pending/legacy content consistently across detail/list/cart/wishlist, retaining media and price', async () => {
    const product = await create();
    const sku = await prisma.commerceSku.create({ data: { clinicId, productId: product.id, code: `PD-${randomUUID()}`, currentPriceToman: 123000n } });
    await prisma.commerceProduct.update({ where: { id: product.id }, data: { status: 'ACTIVE' } });
    const image = await prisma.commerceProductImage.create({ data: { productId: product.id, objectKey: `disposable-test/${randomUUID()}`, mimeType: 'image/webp', sizeBytes: 120, width: 10, height: 10, altText: 'تصویر آزمایشی' } });
    const cart = await app.inject({ method: 'PUT', url: '/v1/patients/me/cart', headers: headers(patient.token), payload: { skuId: sku.id, quantity: 2 } }); expect(cart.statusCode).toBe(200);
    const wish = await app.inject({ method: 'PUT', url: '/v1/patients/me/wishlist', headers: headers(patient.token), payload: { skuId: sku.id, saved: true } }); expect(wish.statusCode).toBe(200);
    async function projections() {
      const detail = (await app.inject({ method: 'GET', url: `/v1/commerce/products/${product.id}` })).json();
      const list = (await app.inject({ method: 'GET', url: `/v1/commerce/products?categoryId=${categoryId}` })).json().items.find((item: { id: string }) => item.id === product.id);
      const cart = (await app.inject({ method: 'GET', url: '/v1/patients/me/cart', headers: headers(patient.token) })).json().items[0];
      const wish = (await app.inject({ method: 'GET', url: '/v1/patients/me/wishlist', headers: headers(patient.token) })).json().items[0];
      expect(detail.skus[0]).toMatchObject({ id: sku.id, currentPriceToman: '123000' }); expect(cart.quantity).toBe(2); expect(cart.sku.id).toBe(sku.id);
      const records = [detail, list, cart.product, wish.product];
      for (const record of records) { expect(record.image).toMatchObject({ id: image.id }); expect(record.image.objectKey).toBeUndefined(); expect(record.sourceReference).toBeUndefined(); expect(record.contentApprovedByUserId).toBeUndefined(); }
      expect(list.content).toBeUndefined(); expect(cart.product.content).toBeUndefined();
      return { detail, records };
    }
    for (const record of (await projections()).records) expect(record).toMatchObject({ description: null, brand: null, shortDescription: null });
    await approve(product.id, 1);
    const approved = await projections();
    expect(approved.detail.content).toMatchObject({ contentRevision: 1, ingredients: null, brand: 'Fixture brand', description: 'Fixture description' });
    expect(approved.detail.content.provenance).toBeUndefined(); expect(approved.detail.content.contentApprovedByUserId).toBeUndefined();
    for (const record of approved.records) expect(record).toMatchObject({ description: 'Fixture description', brand: 'Fixture brand' });
    await save(product.id, 1, { warnings: 'new pending fixture warning' });
    expect((await projections()).detail.content).toBeNull();
    for (const record of (await projections()).records) expect(record.description).toBeNull();
    // Model a migrated row; the separate migration test proves this classification is performed safely.
    await prisma.commerceProduct.update({ where: { id: product.id }, data: { brand: null, warnings: null, sourceKind: null, sourceReference: null, contentRevision: 0, legacyContent: true, description: 'Unchanged legacy description' } });
    for (const record of (await projections()).records) expect(record).toMatchObject({ description: 'Unchanged legacy description', brand: null });
    expect((await call('GET', product.id)).json().status).toBe('LEGACY_UNREVIEWED');
    await save(product.id, 0, { description: 'first managed edit' });
    expect((await projections()).detail.description).toBeNull();
    await prisma.commerceProduct.update({ where: { id: product.id }, data: { status: 'ARCHIVED' } });
    expect((await app.inject({ method: 'GET', url: `/v1/commerce/products/${product.id}` })).statusCode).toBe(404);
  });
});

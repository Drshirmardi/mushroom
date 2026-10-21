import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';
import { ProductImageCleanupHandler } from '../src/modules/outbox/product-image-cleanup.handler';
import { IMAGE_CLEANUP_EVENT } from '../src/modules/commerce/media/product-image.service';
import { storageUnavailable } from '../src/modules/commerce/media/product-image.errors';
import { PublicAuthRateLimiter } from '../src/modules/identity/application/ports/public-auth-rate-limiter';
import { OutboxWorker } from '../src/modules/outbox/outbox.worker';
import { createReleaseAdminTestPrincipal } from './release-admin-test-support';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PRODUCT_MEDIA_TEST_ISOLATED !== '1')('product media (isolated PostgreSQL + mocked private R2)', () => {
  let app: NestFastifyApplication; let prisma: PrismaService; let storage: ProductImageStorage; let productId: string; let adminToken: string; let staffToken: string; let png: Buffer;
  const objects = new Map<string, Buffer>();
  const route = () => `/v1/admin/commerce/products/${productId}/image`;
  const headers = (token = adminToken) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });
  const multipart = (bytes = png, filename = 'test.png', mimeType = 'image/png', extra = '') => Buffer.concat([
    Buffer.from(`--media-boundary\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`), bytes,
    Buffer.from(`\r\n--media-boundary\r\nContent-Disposition: form-data; name="altText"\r\n\r\nتصویر آزمایشی${extra}\r\n--media-boundary--\r\n`),
  ]);
  const upload = (etag = '"none"', key = randomUUID(), body = multipart()) => app.inject({ method: 'PUT', url: route(), headers: { ...headers(), 'content-type': 'multipart/form-data; boundary=media-boundary', 'if-match': etag, 'idempotency-key': key }, payload: body });
  const remove = (etag: string, key = randomUUID()) => app.inject({ method: 'DELETE', url: route(), headers: { ...headers(), 'if-match': etag, 'idempotency-key': key } });
  const cleanup = async () => {
    const rows = await prisma.outboxEvent.findMany({ where: { aggregateId: productId, eventType: IMAGE_CLEANUP_EVENT, status: 'PENDING' } });
    for (const row of rows) await prisma.outboxEvent.update({ where: { id: row.id }, data: { availableAt: new Date(0), payload: { ...(row.payload as object), deadline: new Date(0).toISOString() } } });
    await app.get(OutboxWorker).tick();
  };

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (process.env.NODE_ENV !== 'test' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/product_media_test') throw new Error('Media tests require the explicitly enabled disposable product_media_test database.');
    app = await createApiApplication(); await app.init(); app.get(OutboxWorker).onModuleDestroy();
    prisma = app.get(PrismaService); storage = app.get(ProductImageStorage);
    const tokens = app.get(AccessTokenService); adminToken = (await createReleaseAdminTestPrincipal(prisma, tokens)).token; staffToken = (await createTestAccessToken(prisma, tokens, ['STAFF'])).token;
    png = await sharp({ create: { width: 32, height: 24, channels: 3, background: 'blue' } }).png().toBuffer();
  }, 30_000);
  beforeEach(async () => {
    vi.restoreAllMocks(); objects.clear();
    vi.spyOn(storage, 'isEnabled').mockReturnValue(true);
    vi.spyOn(storage, 'put').mockImplementation(async (key, bytes) => {
      expect(await prisma.outboxEvent.count({ where: { eventType: IMAGE_CLEANUP_EVENT, payload: { path: ['key'], equals: key } } })).toBe(1);
      objects.set(key, Buffer.from(bytes));
    });
    vi.spyOn(storage, 'read').mockImplementation(async key => { const bytes = objects.get(key); if (!bytes) throw storageUnavailable(); return bytes; });
    vi.spyOn(storage, 'delete').mockImplementation(async key => { objects.delete(key); });
    vi.spyOn(app.get(PublicAuthRateLimiter), 'consume').mockResolvedValue(true);
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
    const category = await prisma.commerceCategory.create({ data: { clinicId: clinic.id, name: 'media fixture', slug: randomUUID() } });
    const product = await prisma.commerceProduct.create({ data: { clinicId: clinic.id, categoryId: category.id, title: 'media fixture', slug: randomUUID(), status: 'ACTIVE', skus: { create: { clinicId: clinic.id, code: randomUUID(), currentPriceToman: 1n } } } });
    productId = product.id;
  });
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });

  it('keeps existing products without images compatible, documents nullable metadata and multipart PUT', async () => {
    const metadata = await app.inject({ method: 'GET', url: route(), headers: headers() }); expect(metadata.statusCode).toBe(200); expect(metadata.json()).toBeNull(); expect(metadata.headers.etag).toBe('"none"');
    const detail = await app.inject({ method: 'GET', url: `/v1/commerce/products/${productId}` }); expect(detail.json().image).toBeNull();
    const docs = (await app.inject({ method: 'GET', url: '/docs-json' })).json();
    const path = docs.paths['/v1/admin/commerce/products/{productId}/image']; expect(path.put.requestBody.content['multipart/form-data'].schema.properties.file.format).toBe('binary'); expect(path.get.responses['200'].content['application/json'].schema.nullable).toBe(true);
  });
  it('uploads one sanitized image, returns no storage key and serves the same bytes privately/publicly without cache', async () => {
    const response = await upload(); expect(response.statusCode).toBe(200); const image = response.json(); expect(image).toMatchObject({ mimeType: 'image/webp', width: 32, height: 24 }); expect(JSON.stringify(image)).not.toContain('objectKey'); expect(JSON.stringify(image)).not.toContain('cloudflarestorage');
    const detail = await app.inject({ method: 'GET', url: `/v1/commerce/products/${productId}` }); expect(detail.json().image.id).toBe(image.id);
    const bytes = await app.inject({ method: 'GET', url: detail.json().image.contentPath }); expect(bytes.statusCode).toBe(200); expect(bytes.headers['cache-control']).toBe('no-store'); expect(bytes.headers['x-content-type-options']).toBe('nosniff'); expect((await sharp(bytes.rawPayload).metadata()).format).toBe('webp');
    const preview = await app.inject({ method: 'GET', url: `${route()}/content`, headers: headers() }); expect(preview.rawPayload).toEqual(bytes.rawPayload);
    await cleanup(); expect(objects.size).toBe(1);
  });
  it('enforces authentication, permissions, clinic ownership and preview protection', async () => {
    expect((await app.inject({ method: 'GET', url: route() })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: route(), headers: headers(staffToken) })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `${route()}/content` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PUT', url: route(), headers: { 'content-type': 'multipart/form-data; boundary=media-boundary' }, payload: multipart() })).statusCode).toBe(401);
    const other = await prisma.clinic.create({ data: { name: 'other media clinic', status: 'INACTIVE' } }); const category = await prisma.commerceCategory.create({ data: { clinicId: other.id, name: 'other', slug: randomUUID() } }); const product = await prisma.commerceProduct.create({ data: { clinicId: other.id, categoryId: category.id, title: 'other', slug: randomUUID() } }); productId = product.id;
    expect((await upload()).statusCode).toBe(404); expect(storage.put).not.toHaveBeenCalled();
  });
  it('rejects unsupported, mismatched, malformed, oversized and extra-file uploads before storage', async () => {
    for (const payload of [multipart(Buffer.from('<svg/>'), 'test.svg', 'image/svg+xml'), multipart(png, 'test.jpg', 'image/jpeg'), multipart(png.subarray(0, 12)), multipart(Buffer.alloc(5242881)), Buffer.concat([multipart().subarray(0, multipart().length - '--media-boundary--\r\n'.length), Buffer.from('--media-boundary\r\nContent-Disposition: form-data; name="file"; filename="again.png"\r\nContent-Type: image/png\r\n\r\n'), png, Buffer.from('\r\n--media-boundary--\r\n')])]) {
      const result = await upload('"none"', randomUUID(), payload); expect([413, 422]).toContain(result.statusCode);
    }
    expect(storage.put).not.toHaveBeenCalled();
  });
  it('fails closed while disabled and when the rate limiter denies an upload', async () => {
    vi.mocked(storage.isEnabled).mockReturnValue(false); expect((await upload()).statusCode).toBe(503);
    vi.mocked(storage.isEnabled).mockReturnValue(true); vi.mocked(app.get(PublicAuthRateLimiter).consume).mockResolvedValue(false); expect((await upload()).statusCode).toBe(429); expect(storage.put).not.toHaveBeenCalled();
  });
  it('replaces and removes immediately while durable cleanup deletes only superseded objects', async () => {
    const first = await upload(); const firstId = first.json().id; const oldPublicPath = `/v1/commerce/products/${productId}/images/${firstId}`;
    const second = await upload(first.headers.etag as string); expect(second.statusCode).toBe(200); expect(second.json().id).not.toBe(firstId);
    expect((await app.inject({ method: 'GET', url: oldPublicPath })).statusCode).toBe(404);
    await cleanup(); expect(objects.size).toBe(1); const removeKey = randomUUID(); expect((await remove(second.headers.etag as string, removeKey)).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: route(), headers: headers() })).json()).toBeNull(); expect((await app.inject({ method: 'GET', url: `/v1/commerce/products/${productId}/images/${second.json().id}` })).statusCode).toBe(404);
    const third = await upload(); expect(third.statusCode).toBe(200); expect((await remove(second.headers.etag as string, removeKey)).statusCode).toBe(204);
    await cleanup(); expect(objects.size).toBe(1); expect((await prisma.commerceProductImage.findUniqueOrThrow({ where: { productId } })).id).toBe(third.json().id);
  });
  it('replays committed uploads after a lost response without writing again or reverting later generations', async () => {
    const key = randomUUID(); const first = await upload('"none"', key); const next = await upload(first.headers.etag as string); const calls = vi.mocked(storage.put).mock.calls.length;
    const replay = await upload('"none"', key); expect(replay.json()).toEqual(first.json()); expect(storage.put).toHaveBeenCalledTimes(calls); expect((await prisma.commerceProductImage.findUniqueOrThrow({ where: { productId } })).id).toBe(next.json().id);
    expect((await upload(next.headers.etag as string, key)).statusCode).toBe(409);
  });
  it('preserves the old image after an ambiguous storage failure and cleans the possibly uploaded object', async () => {
    const first = await upload(); vi.mocked(storage.put).mockImplementationOnce(async (key, bytes) => { objects.set(key, bytes); throw storageUnavailable(); });
    const failed = await upload(first.headers.etag as string); expect(failed.statusCode).toBe(503); expect((await prisma.commerceProductImage.findUniqueOrThrow({ where: { productId } })).id).toBe(first.json().id);
    await cleanup(); expect(objects.size).toBe(1);
  });
  it('reports pending/expired ambiguous operations without replaying a storage write', async () => {
    const key = randomUUID(); vi.mocked(storage.put).mockRejectedValueOnce(storageUnavailable()); expect((await upload('"none"', key)).statusCode).toBe(503);
    const retry = await upload('"none"', key); expect(retry.statusCode).toBe(409); expect(retry.json().code).toBe('COMMERCE_IMAGE_OPERATION_PENDING'); expect(storage.put).toHaveBeenCalledTimes(1);
    const event = await prisma.outboxEvent.findFirstOrThrow({ where: { aggregateId: productId, eventType: IMAGE_CLEANUP_EVENT } });
    await prisma.outboxEvent.update({ where: { id: event.id }, data: { payload: { ...(event.payload as object), deadline: new Date(0).toISOString() } } });
    const expired = await upload('"none"', key); expect(expired.json().code).toBe('COMMERCE_IMAGE_OPERATION_EXPIRED'); expect(storage.put).toHaveBeenCalledTimes(1);
  });
  it('preserves the old image if DB commit fails after upload, with a previously persisted orphan cleanup intent', async () => {
    const first = await upload(); vi.mocked(storage.put).mockImplementationOnce(async (key, bytes) => { objects.set(key, bytes); vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('test database failure')); });
    const failed = await upload(first.headers.etag as string); expect(failed.statusCode).toBe(500); expect(failed.body).not.toContain('test database failure'); expect((await prisma.commerceProductImage.findUniqueOrThrow({ where: { productId } })).id).toBe(first.json().id);
    await cleanup(); expect(objects.size).toBe(1);
  });
  it('allows one concurrent replacement and cleans the losing upload without overwriting the winner', async () => {
    const first = await upload(); let count = 0; let release!: () => void; const both = new Promise<void>(resolve => { release = resolve; });
    vi.mocked(storage.put).mockImplementation(async (key, bytes) => { objects.set(key, bytes); if (++count === 2) release(); await both; });
    const results = await Promise.all([upload(first.headers.etag as string), upload(first.headers.etag as string)]); expect(results.map(x => x.statusCode).sort()).toEqual([200, 412]);
    await cleanup(); expect(objects.size).toBe(1); expect(await prisma.commerceProductImage.count({ where: { productId } })).toBe(1);
  });
  it('retries cleanup failures through the existing outbox dispatcher', async () => {
    const first = await upload(); await remove(first.headers.etag as string); vi.mocked(storage.delete).mockRejectedValueOnce(storageUnavailable());
    await cleanup(); expect(await prisma.outboxEvent.count({ where: { aggregateId: productId, status: 'PENDING', attempts: { gt: 0 } } })).toBeGreaterThan(0);
    await cleanup(); expect(objects.size).toBe(0);
  });
  it('rejects a third upload while two admitted uploads are waiting and protects the old generation', async () => {
    let count = 0; let admitted!: () => void; let release!: () => void;
    const started = new Promise<void>(resolve => { admitted = resolve; }); const gate = new Promise<void>(resolve => { release = resolve; });
    vi.mocked(storage.put).mockImplementation(async (key, bytes) => { objects.set(key, bytes); if (++count === 2) admitted(); await gate; });
    const first = upload(); const second = upload(); await started;
    const third = await upload(); expect(third.statusCode).toBe(503); expect(third.json().code).toBe('COMMERCE_IMAGE_BUSY'); release();
    expect((await Promise.all([first, second])).map(x => x.statusCode).sort()).toEqual([200, 412]);
  });
  it('revokes public reads if the clinic is unpublished during remote I/O', async () => {
    const image = (await upload()).json(); const product = await prisma.commerceProduct.findUniqueOrThrow({ where: { id: productId } });
    try {
      vi.mocked(storage.read).mockImplementationOnce(async key => { await prisma.clinic.update({ where: { id: product.clinicId }, data: { status: 'INACTIVE' } }); return objects.get(key)!; });
      expect((await app.inject({ method: 'GET', url: `/v1/commerce/products/${productId}/images/${image.id}` })).statusCode).toBe(404);
    } finally { await prisma.clinic.update({ where: { id: product.clinicId }, data: { status: 'ACTIVE' } }); }
  });
  it('blocks draft/archived/category-hidden/clinic-inactive/no-active-SKU images including changes during storage reads', async () => {
    const uploaded = await upload(); const url = `/v1/commerce/products/${productId}/images/${uploaded.json().id}`;
    for (const status of ['DRAFT', 'ARCHIVED'] as const) { await prisma.commerceProduct.update({ where: { id: productId }, data: { status } }); expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404); }
    await prisma.commerceProduct.update({ where: { id: productId }, data: { status: 'ACTIVE' } }); const product = await prisma.commerceProduct.findUniqueOrThrow({ where: { id: productId } });
    await prisma.commerceCategory.update({ where: { id: product.categoryId }, data: { isActive: false } }); expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404); await prisma.commerceCategory.update({ where: { id: product.categoryId }, data: { isActive: true } });
    await prisma.commerceSku.updateMany({ where: { productId }, data: { isActive: false } }); expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404); await prisma.commerceSku.updateMany({ where: { productId }, data: { isActive: true } });
    vi.mocked(storage.read).mockImplementationOnce(async key => { await prisma.commerceProduct.update({ where: { id: productId }, data: { status: 'ARCHIVED' } }); return objects.get(key)!; }); expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404);
  });
  it('transfers image metadata to persisted cart and wishlist product DTOs', async () => {
    const image = (await upload()).json(); const tokens = app.get(AccessTokenService); const patient = await createTestAccessToken(prisma, tokens, ['PATIENT']); const product = await prisma.commerceProduct.findUniqueOrThrow({ where: { id: productId }, include: { skus: true } });
    await prisma.patientProfile.create({ data: { userId: patient.userId, clinicId: product.clinicId } });
    for (const [path, body] of [['cart', { skuId: product.skus[0].id, quantity: 1 }], ['wishlist', { skuId: product.skus[0].id, saved: true }]] as const) {
      const response = await app.inject({ method: 'PUT', url: `/v1/patients/me/${path}`, headers: headers(patient.token), payload: body }); expect(response.statusCode).toBe(200); expect(response.json().items[0].product.image.id).toBe(image.id);
    }
  });
});

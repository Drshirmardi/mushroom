import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';
import { BANNER_MEDIA_CLEANUP } from '../src/modules/content/banner-media.policy';
import { OutboxWorker } from '../src/modules/outbox/outbox.worker';
import { PublicAuthRateLimiter } from '../src/modules/identity/application/ports/public-auth-rate-limiter';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.STORE_BANNER_TEST_ISOLATED !== '1')('banner media (real isolated PostgreSQL, private storage double)', () => {
  let app: NestFastifyApplication, db: PrismaService, storage: ProductImageStorage, png: Buffer;
  let admin: Awaited<ReturnType<typeof actor>>; let row: { id: string; etag: string; clinicId: string };
  const objects = new Map<string, Buffer>();
  async function actor(role: 'ADMIN' | 'PATIENT') {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    await db.userRole.create({ data: { userId: auth.userId, roleId: (await db.role.findUniqueOrThrow({ where: { code: role } })).id } }); return auth;
  }
  const request = (method: 'GET'|'POST'|'PATCH'|'PUT'|'DELETE', path: string, payload?: object | Buffer, extra: Record<string, string> = {}, token = admin?.token) => app.inject({ method, url: `/v1/${path}`, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), origin: 'http://localhost:3000', ...(payload && !Buffer.isBuffer(payload) ? { 'content-type': 'application/json' } : {}), ...extra }, ...(payload ? { payload: Buffer.isBuffer(payload) ? payload : JSON.stringify(payload) } : {}) });
  const path = () => `admin/content/banners/${row.id}/image`;
  const multipart = (bytes = png) => Buffer.concat([Buffer.from('--banner\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n'), bytes, Buffer.from('\r\n--banner--\r\n')]);
  const headers = (etag = row.etag, key = randomUUID()) => ({ 'if-match': etag, 'idempotency-key': key });
  const upload = (etag = row.etag, key = randomUUID(), bytes = png) => request('PUT', path(), multipart(bytes), { ...headers(etag, key), 'content-type': 'multipart/form-data; boundary=banner' });
  async function current() { return (await request('GET', 'admin/content/banners')).json().items.find((item: { id: string }) => item.id === row.id); }
  async function cleanup() {
    const events = await db.outboxEvent.findMany({ where: { aggregateId: row.id, eventType: BANNER_MEDIA_CLEANUP, status: 'PENDING' } });
    for (const event of events) await db.outboxEvent.update({ where: { id: event.id }, data: { availableAt: new Date(0), payload: { ...(event.payload as object), deadline: new Date(0).toISOString() } } });
    await app.get(OutboxWorker).tick();
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost','127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/store_banner_review_test') throw new Error('New disposable store_banner_review_test on localhost:55419 required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); app.get(OutboxWorker).onModuleDestroy(); db = app.get(PrismaService); storage = app.get(ProductImageStorage); admin = await actor('ADMIN');
    png = await sharp({ create: { width: 30, height: 20, channels: 3, background: 'green' } }).png().toBuffer();
  }, 30000);
  beforeEach(async () => {
    vi.restoreAllMocks(); objects.clear(); vi.spyOn(storage, 'isEnabled').mockReturnValue(true);
    vi.spyOn(storage, 'put').mockImplementation(async (key, bytes) => { expect(await db.outboxEvent.count({ where: { eventType: BANNER_MEDIA_CLEANUP, payload: { path: ['key'], equals: key } } })).toBe(1); objects.set(key, Buffer.from(bytes)); });
    vi.spyOn(storage, 'read').mockImplementation(async key => { const bytes = objects.get(key); if (!bytes) throw new Error('Synthetic unavailable object'); return bytes; });
    vi.spyOn(storage, 'delete').mockImplementation(async key => { objects.delete(key); });
    vi.spyOn(app.get(PublicAuthRateLimiter), 'consume').mockResolvedValue(true);
    const created = await request('POST', 'admin/content/banners', { title: 'Synthetic banner', destinationUrl: '/store' }); expect(created.statusCode).toBe(201); row = created.json();
  });
  afterAll(async () => { vi.restoreAllMocks(); await app?.close(); });

  it('accepts internal/HTTP links, clears destination, rejects unsafe links and stale metadata edits', async () => {
    const saved = await request('PATCH', `admin/content/banners/${row.id}`, { destinationUrl: null }, { 'if-match': row.etag }); expect(saved.statusCode).toBe(200); expect(saved.json().destinationUrl).toBeNull();
    expect((await request('PATCH', `admin/content/banners/${row.id}`, { title: 'stale' }, { 'if-match': row.etag })).statusCode).toBe(412);
    for (const destinationUrl of ['javascript:alert(1)', '//evil.test', '/\\evil.test', 'https://user:pass@evil.test', 'https://good.test\nevil']) expect((await request('POST', 'admin/content/banners', { title: 'Invalid', destinationUrl })).statusCode).toBe(400);
    expect((await request('POST', 'admin/content/banners', { title: 'External', destinationUrl: 'https://example.test/path' })).statusCode).toBe(201);
  });
  it('uploads sanitized media, keeps drafts private, publishes only minimized owned media', async () => {
    const r = await upload(); expect(r.statusCode).toBe(200); expect(r.json().mediaObjectKey).toMatch(new RegExp(`^content/${row.clinicId}/${row.id}/`));
    expect((await request('GET', `content/banners/${row.id}/image`, undefined, {}, '')).statusCode).toBe(404);
    const published = await request('PATCH', `admin/content/banners/${row.id}`, { publicationStatus: 'PUBLISHED' }, { 'if-match': r.json().etag }); expect(published.statusCode).toBe(200);
    const publicList = await request('GET', 'content/banners', undefined, {}, ''); expect(publicList.headers['cache-control']).toBe('no-store');
    const item = publicList.json().items.find((i: { id: string }) => i.id === row.id); expect(Object.keys(item).sort()).toEqual(['contentPath','destinationUrl','id','title']);
    const image = await request('GET', `content/banners/${row.id}/image`, undefined, {}, ''); expect(image.statusCode).toBe(200); expect(image.headers['cache-control']).toBe('no-store'); expect((await sharp(image.rawPayload).metadata()).format).toBe('webp');
    await cleanup(); expect(objects.size).toBe(1);
  });
  it('replays the exact upload without rewriting storage and rejects key reuse for another payload', async () => {
    const key = randomUUID(), r = await upload(row.etag, key); expect(r.statusCode).toBe(200);
    const replay = await upload(row.etag, key); expect(replay.statusCode).toBe(200); expect(replay.json()).toEqual(r.json()); expect(storage.put).toHaveBeenCalledTimes(1);
    const other = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'red' } }).png().toBuffer(); expect((await upload(row.etag, key, other)).statusCode).toBe(409);
  });
  it('detaches before cleanup, retries storage deletion and does not remove a concurrent replacement', async () => {
    const r = await upload(); const oldKey = r.json().mediaObjectKey, key = randomUUID();
    expect((await request('DELETE', path(), undefined, headers(r.json().etag, key))).statusCode).toBe(204); expect(storage.delete).not.toHaveBeenCalled(); expect((await current()).mediaObjectKey).toBeNull();
    expect((await request('DELETE', path(), undefined, headers(r.json().etag, key))).statusCode).toBe(204);
    const next = await upload((await current()).etag); expect(next.statusCode).toBe(200); expect((await request('DELETE', path(), undefined, headers(r.json().etag))).statusCode).toBe(412);
    vi.mocked(storage.delete).mockImplementation(async key => { if (key === oldKey) throw new Error('Synthetic storage outage'); objects.delete(key); }); await cleanup(); expect(objects.has(oldKey)).toBe(true);
    vi.mocked(storage.delete).mockImplementation(async key => { objects.delete(key); });
    await cleanup(); expect(objects.has(oldKey)).toBe(false); expect(objects.has(next.json().mediaObjectKey)).toBe(true);
  });
  it('keeps the old bytes and metadata on upload-audit failure, then cleans the orphan', async () => {
    const original = await upload(); const oldKey = original.json().mediaObjectKey;
    await db.$executeRawUnsafe(`CREATE FUNCTION banner_review_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id='${admin.userId}'::uuid AND NEW.action IN ('CONTENT_BANNER_MEDIA_UPLOADED','CONTENT_BANNER_MEDIA_REMOVED') THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER banner_review_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION banner_review_fail()`);
    try {
      expect((await upload(original.json().etag)).statusCode).toBe(500); expect((await current()).mediaObjectKey).toBe(oldKey); expect(objects.has(oldKey)).toBe(true);
      expect((await request('DELETE', path(), undefined, headers(original.json().etag))).statusCode).toBe(500); expect((await current()).mediaObjectKey).toBe(oldKey); expect(storage.delete).not.toHaveBeenCalled();
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER banner_review_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION banner_review_fail()`); }
    await cleanup(); expect([...objects.keys()]).toEqual([oldKey]);
  });
  it('allows only one concurrent replacement for an exact revision', async () => {
    const original = await upload(); let puts = 0; let release!: () => void; const ready = new Promise<void>(resolve => { release = resolve; });
    vi.mocked(storage.put).mockImplementation(async (key, bytes) => { objects.set(key, bytes); if (++puts === 2) release(); await ready; });
    const pair = await Promise.all([upload(original.json().etag), upload(original.json().etag)]); expect(pair.map(r => r.statusCode).sort()).toEqual([200,412]);
    await cleanup(); expect([...objects.keys()]).toEqual([(await current()).mediaObjectKey]);
  });
  it('rechecks unpublication after the remote read', async () => {
    const r = await upload(); await request('PATCH', `admin/content/banners/${row.id}`, { publicationStatus: 'PUBLISHED' });
    vi.mocked(storage.read).mockImplementationOnce(async key => { await db.banner.update({ where: { id: row.id }, data: { publicationStatus: 'DRAFT', publishedAt: null } }); return objects.get(key)!; });
    expect((await request('GET', `content/banners/${row.id}/image`, undefined, {}, '')).statusCode).toBe(404); expect(r.statusCode).toBe(200);
  });
  it('rejects arbitrary media attachments, foreign namespaces, unauthenticated and patient writes', async () => {
    const media = { objectKey: `content/${randomUUID()}/banner.webp`, contentType: 'image/webp', sizeBytes: 20 };
    expect((await request('POST', 'admin/content/banners', { title: 'Bad key', media })).statusCode).toBe(422);
    expect((await request('PATCH', `admin/content/banners/${row.id}`, { media })).statusCode).toBe(422);
    await db.banner.update({ where: { id: row.id }, data: { mediaObjectKey: media.objectKey, mediaContentType: media.contentType, mediaSizeBytes: 20, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
    expect((await request('GET', `content/banners/${row.id}/image`, undefined, {}, '')).statusCode).toBe(404); expect(storage.read).not.toHaveBeenCalled();
    expect((await request('PUT', path(), multipart(), { ...headers(), 'content-type': 'multipart/form-data; boundary=banner' }, '')).statusCode).toBe(401);
    expect((await request('DELETE', path(), undefined, headers(), (await actor('PATIENT')).token)).statusCode).toBe(403);
  });
  it('rejects missing revisions, invalid uploads and unavailable storage before changing metadata', async () => {
    expect((await request('DELETE', path())).statusCode).toBe(428);
    expect((await upload(row.etag, randomUUID(), Buffer.from('not an image'))).statusCode).toBe(422); expect(storage.put).not.toHaveBeenCalled();
    vi.mocked(storage.isEnabled).mockReturnValue(false); expect((await upload()).statusCode).toBe(503); expect((await current()).mediaObjectKey).toBeNull();
  });
});

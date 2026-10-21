import { createHash, randomUUID } from 'node:crypto';
import { HttpException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Prisma, type Banner } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ProductImageProcessor, readProductImageUpload } from '../commerce/media/product-image-processor';
import { ProductImageStorage } from '../commerce/media/product-image-storage';
import { PublicAuthRateLimiter } from '../identity/application/ports/public-auth-rate-limiter';
import { OutboxService } from '../outbox/outbox.service';
import { BANNER_MEDIA_CLEANUP, bannerEtag, bannerMissing, bannerRevisionConflict, ownBannerMedia, projectBanner } from './banner-media.policy';

type Context = { actorUserId: string; actorSessionId: string; requestId?: string; ipAddress?: string };
type Intent = { key: string; bannerId: string; clinicId: string; deadline: string; fingerprint: string; result?: ReturnType<typeof projectBanner> | null };
const unavailable = () => new HttpException({ code: 'CONTENT_MEDIA_UNAVAILABLE', message: 'Banner storage is unavailable.', details: {} }, 503);

@Injectable()
export class BannerMediaService {
  private active = 0;
  constructor(private readonly prisma: PrismaService, private readonly storage: ProductImageStorage, private readonly processor: ProductImageProcessor, private readonly outbox: OutboxService, private readonly limiter: PublicAuthRateLimiter) {}
  private async owned(id: string) {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } });
    const banner = clinic && await this.prisma.banner.findFirst({ where: { id, clinicId: clinic.id } });
    if (!banner) throw bannerMissing(); return banner;
  }
  private async lock(tx: Prisma.TransactionClient, banner: Banner) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM banners WHERE id=${banner.id}::uuid AND clinic_id=${banner.clinicId}::uuid FOR UPDATE`);
    const current = await tx.banner.findFirst({ where: { id: banner.id, clinicId: banner.clinicId } });
    if (!current) throw bannerMissing(); return current;
  }
  private headers(request: FastifyRequest) {
    const etag = request.headers['if-match'], key = request.headers['idempotency-key'];
    if (typeof etag !== 'string' || !/^"[a-f0-9]{64}"$/u.test(etag)) throw new HttpException({ code: 'CONTENT_REVISION_CONFLICT', message: 'A current If-Match header is required.', details: {} }, 428);
    if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u.test(key)) throw new HttpException({ code: 'IDEMPOTENCY_KEY_INVALID', message: 'A valid Idempotency-Key header is required.', details: {} }, 422);
    return { etag, key };
  }
  private replay(intent: Intent, fingerprint: string) {
    if (intent.fingerprint !== fingerprint) throw new HttpException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'The operation key was used for another request.', details: {} }, 409);
    if (!('result' in intent)) throw new HttpException({ code: 'CONTENT_CONFLICT', message: 'The previous upload is pending or expired. Reload before starting another operation.', details: {} }, 409);
    return intent.result;
  }
  private async limit(request: FastifyRequest, actor?: string) {
    if (!await this.limiter.consume({ scope: actor ? 'banner-media-write' : 'banner-media-read', subjects: [{ kind: 'ip', value: request.ip, limit: actor ? 60 : 240 }, ...(actor ? [{ kind: 'user', value: actor, limit: 10 }] : [])], windowMs: 60_000, at: new Date() })) throw new HttpException({ code: 'CONTENT_RATE_LIMITED', message: 'Banner media rate limit exceeded.', details: {} }, 429);
  }
  private audit(tx: Prisma.TransactionClient, id: string, action: string, context: Context) { return tx.auditEvent.create({ data: { ...context, subjectType: 'CONTENT', subjectId: id, action, metadata: {} } }); }
  private async cleanup(tx: Prisma.TransactionClient, banner: Banner, key: string) {
    if (!ownBannerMedia({ ...banner, mediaObjectKey: key })) return;
    await this.outbox.enqueue(tx, { eventType: BANNER_MEDIA_CLEANUP, aggregateType: 'CONTENT_BANNER', aggregateId: banner.id, idempotencyKey: `banner-cleanup:${createHash('sha256').update(key).digest('hex')}`, payload: { key, bannerId: banner.id, clinicId: banner.clinicId, deadline: new Date().toISOString() } });
  }
  async upload(id: string, request: FastifyRequest, context: Context) {
    const banner = await this.owned(id), { etag, key: operationKey } = this.headers(request);
    if (!this.storage.isEnabled()) throw unavailable(); await this.limit(request, context.actorUserId);
    if (this.active >= 2) throw unavailable(); this.active++;
    const deadline = new Date(Date.now() + 60_000); const timer = setTimeout(() => request.raw.destroy(), 60_000); timer.unref();
    try {
      const file = await readProductImageUpload(request);
      const fingerprint = createHash('sha256').update(etag).update('\0').update(file.bytes).update('\0').update(file.mimeType).update('\0').update(file.filename).digest('hex');
      const intentKey = `banner-upload:${banner.id}:${context.actorUserId}:${operationKey}`;
      const processed = await this.processor.process(file);
      const key = `content/${banner.clinicId}/${banner.id}/${randomUUID()}.webp`;
      const intent: Intent = { key, bannerId: id, clinicId: banner.clinicId, deadline: deadline.toISOString(), fingerprint };
      const prepared = await this.prisma.$transaction(async tx => {
        const current = await this.lock(tx, banner), prior = await tx.outboxEvent.findUnique({ where: { idempotencyKey: intentKey } });
        if (prior) return { prior: prior.payload as unknown as Intent };
        if (bannerEtag(current) !== etag) throw bannerRevisionConflict();
        await this.outbox.enqueue(tx, { eventType: BANNER_MEDIA_CLEANUP, aggregateType: 'CONTENT_BANNER', aggregateId: id, idempotencyKey: intentKey, payload: intent as unknown as Prisma.InputJsonValue, availableAt: new Date(deadline.getTime() + 90_000) });
        return {};
      });
      if (prepared.prior) return this.replay(prepared.prior, fingerprint);
      if (Date.now() >= deadline.getTime()) throw unavailable();
      await this.storage.put(key, processed.bytes);
      return await this.prisma.$transaction(async tx => {
        const current = await this.lock(tx, banner);
        if (Date.now() >= deadline.getTime()) throw unavailable();
        if (bannerEtag(current) !== etag) throw bannerRevisionConflict();
        const updated = await tx.banner.update({ where: { id }, data: { mediaObjectKey: key, mediaContentType: 'image/webp', mediaSizeBytes: processed.bytes.length } });
        const result = projectBanner(updated);
        await tx.outboxEvent.update({ where: { idempotencyKey: intentKey }, data: { payload: JSON.parse(JSON.stringify({ ...intent, result })) as Prisma.InputJsonValue } });
        if (current.mediaObjectKey) await this.cleanup(tx, current, current.mediaObjectKey);
        await this.audit(tx, id, 'CONTENT_BANNER_MEDIA_UPLOADED', context); return result;
      });
    } finally { clearTimeout(timer); this.active--; }
  }
  async remove(id: string, request: FastifyRequest, context: Context) {
    const banner = await this.owned(id), { etag, key } = this.headers(request); await this.limit(request, context.actorUserId);
    const intentKey = `banner-remove:${id}:${context.actorUserId}:${key}`;
    await this.prisma.$transaction(async tx => {
      const current = await this.lock(tx, banner), prior = await tx.outboxEvent.findUnique({ where: { idempotencyKey: intentKey } });
      if (prior) { this.replay(prior.payload as unknown as Intent, etag); return; }
      if (bannerEtag(current) !== etag) throw bannerRevisionConflict();
      await tx.banner.update({ where: { id }, data: { mediaObjectKey: null, mediaContentType: null, mediaSizeBytes: null } });
      if (current.mediaObjectKey) await this.cleanup(tx, current, current.mediaObjectKey);
      await this.outbox.enqueue(tx, { eventType: BANNER_MEDIA_CLEANUP, aggregateType: 'CONTENT_BANNER', aggregateId: id, idempotencyKey: intentKey, payload: { key: '', bannerId: id, clinicId: banner.clinicId, deadline: new Date().toISOString(), fingerprint: etag, result: null } });
      await this.audit(tx, id, 'CONTENT_BANNER_MEDIA_REMOVED', context);
    });
  }
  async content(id: string, request: FastifyRequest, admin = false) {
    await this.limit(request);
    const banner = await this.owned(id);
    if (!ownBannerMedia(banner) || !admin && (banner.publicationStatus !== 'PUBLISHED' || !banner.publishedAt)) throw bannerMissing();
    const bytes = await this.storage.read(banner.mediaObjectKey!);
    const stillCurrent = await this.prisma.banner.findFirst({ where: { id, clinicId: banner.clinicId, clinic: { status: 'ACTIVE' }, mediaObjectKey: banner.mediaObjectKey, ...(admin ? {} : { publicationStatus: 'PUBLISHED', publishedAt: { not: null } }) } });
    if (!stillCurrent) throw bannerMissing();
    return { bytes, contentType: 'image/webp' };
  }
}

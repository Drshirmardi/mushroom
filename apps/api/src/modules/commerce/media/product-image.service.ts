import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import { PublicAuthRateLimiter } from '../../identity/application/ports/public-auth-rate-limiter';
import { imageEtag, imageMetadata, ProductImageDto } from './product-image.dto';
import { imageError, imageMissing, revisionConflict, storageUnavailable } from './product-image.errors';
import { ProductImageProcessor, readProductImageUpload } from './product-image-processor';
import { ProductImageStorage } from './product-image-storage';

type AuditContext = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
type ImageIntent = { key: string; imageId: string; fingerprint: string; deadline: string; productId: string; result?: ProductImageDto | null };
export const IMAGE_CLEANUP_EVENT = 'COMMERCE_PRODUCT_IMAGE_CLEANUP';

@Injectable()
export class ProductImageService {
  private activeUploads = 0;
  constructor(private readonly prisma: PrismaService, private readonly outbox: OutboxService, private readonly storage: ProductImageStorage, private readonly processor: ProductImageProcessor, private readonly limiter: PublicAuthRateLimiter) {}

  private async clinicId() {
    const clinic = await this.prisma.clinic.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, select: { id: true } });
    if (!clinic) throw imageMissing();
    return clinic.id;
  }
  private async owned(productId: string) {
    const clinicId = await this.clinicId();
    const product = await this.prisma.commerceProduct.findFirst({ where: { id: productId, clinicId }, include: { image: true } });
    if (!product) throw imageMissing();
    return product;
  }
  async metadata(productId: string) {
    const product = await this.owned(productId);
    return imageMetadata(product.id, product.image, true);
  }
  private mutationHeaders(request: FastifyRequest) {
    const etag = request.headers['if-match']; const operationKey = request.headers['idempotency-key'];
    if (typeof etag !== 'string' || !/^"(none|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"$/i.test(etag)) throw imageError('COMMERCE_IMAGE_REVISION_CONFLICT', 428, 'A current image If-Match header is required.');
    if (typeof operationKey !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(operationKey)) throw imageError('IDEMPOTENCY_KEY_INVALID', 422, 'A valid idempotency-key header is required.');
    return { etag, operationKey };
  }
  private async lock(tx: Prisma.TransactionClient, productId: string, clinicId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM commerce_products WHERE id = ${productId}::uuid AND clinic_id = ${clinicId}::uuid FOR UPDATE`;
    if (!rows.length) throw imageMissing();
    return tx.commerceProductImage.findUnique({ where: { productId } });
  }
  private assertVersion(productId: string, current: Parameters<typeof imageMetadata>[1], etag: string) {
    if (imageEtag(imageMetadata(productId, current)) !== etag) throw revisionConflict();
  }
  private fingerprint(...values: Array<string | Buffer>) { const hash = createHash('sha256'); for (const value of values) hash.update(value).update('\0'); return hash.digest('hex'); }
  private replay(intent: ImageIntent, fingerprint: string): ProductImageDto | null {
    if (intent.fingerprint !== fingerprint) throw imageError('IDEMPOTENCY_KEY_REUSED', 409, 'The operation key was used for a different image request.');
    if ('result' in intent) return intent.result ?? null;
    if (Date.now() >= Date.parse(intent.deadline)) throw imageError('COMMERCE_IMAGE_OPERATION_EXPIRED', 409, 'The previous image operation expired; reload and use a new operation key.');
    throw imageError('COMMERCE_IMAGE_OPERATION_PENDING', 409, 'The image operation is still pending; reload or retry this operation later.');
  }
  private async rateLimit(request: FastifyRequest, userId: string, publicRead = false) {
    const allowed = await this.limiter.consume({ scope: publicRead ? 'commerce-image-read' : 'commerce-image-write', subjects: [{ kind: 'ip', value: request.ip, limit: publicRead ? 240 : 60 }, ...(!publicRead ? [{ kind: 'user', value: userId, limit: 10 }] : [])], windowMs: 60_000, at: new Date() });
    if (!allowed) throw imageError('COMMERCE_IMAGE_RATE_LIMITED', 429, 'Product image rate limit exceeded.');
  }
  async upload(productId: string, request: FastifyRequest, context: AuditContext) {
    const product = await this.owned(productId);
    const { etag, operationKey } = this.mutationHeaders(request);
    if (!this.storage.isEnabled()) throw storageUnavailable();
    await this.rateLimit(request, context.actorUserId);
    if (this.activeUploads >= 2) throw imageError('COMMERCE_IMAGE_BUSY', 503, 'Image processing is busy; retry later.');
    this.activeUploads++;
    const deadline = new Date(Date.now() + 30_000);
    const timer = setTimeout(() => request.raw.destroy(), 30_000); timer.unref();
    try {
      const file = await readProductImageUpload(request);
      const fingerprint = this.fingerprint(etag, file.bytes, file.altText, file.mimeType, file.filename);
      const intentKey = `commerce-image:upload:${product.id}:${context.actorUserId}:${operationKey}`;
      const prior = await this.prisma.outboxEvent.findUnique({ where: { idempotencyKey: intentKey } });
      if (prior) return this.replay(prior.payload as unknown as ImageIntent, fingerprint);
      const processed = await this.processor.process(file);
      const imageId = randomUUID(); const key = `store/${product.clinicId}/${product.id}/${imageId}.webp`;
      const intent: ImageIntent = { key, imageId, productId, fingerprint, deadline: deadline.toISOString() };
      const prepared = await this.prisma.$transaction(async tx => {
        const current = await this.lock(tx, productId, product.clinicId);
        const duplicate = await tx.outboxEvent.findUnique({ where: { idempotencyKey: intentKey } });
        if (duplicate) return { duplicate };
        this.assertVersion(productId, current, etag);
        const event = await this.outbox.enqueue(tx, { eventType: IMAGE_CLEANUP_EVENT, aggregateType: 'COMMERCE_PRODUCT_IMAGE', aggregateId: productId, idempotencyKey: intentKey, payload: intent as unknown as Prisma.InputJsonValue, availableAt: new Date(deadline.getTime() + 90_000) });
        return { event };
      });
      if ('duplicate' in prepared && prepared.duplicate) return this.replay(prepared.duplicate.payload as unknown as ImageIntent, fingerprint);
      if (Date.now() >= deadline.getTime()) throw imageError('COMMERCE_IMAGE_OPERATION_EXPIRED', 409, 'Image upload deadline expired.');
      await this.storage.put(key, processed.bytes);
      return await this.prisma.$transaction(async tx => {
        const current = await this.lock(tx, productId, product.clinicId);
        if (Date.now() >= deadline.getTime()) throw imageError('COMMERCE_IMAGE_OPERATION_EXPIRED', 409, 'Image upload deadline expired.');
        this.assertVersion(productId, current, etag);
        const data = { id: imageId, objectKey: key, mimeType: 'image/webp', sizeBytes: processed.bytes.length, width: processed.width, height: processed.height, altText: file.altText, status: 'READY' as const };
        const image = await tx.commerceProductImage.upsert({ where: { productId }, create: { productId, ...data }, update: { ...data, createdAt: new Date() } });
        const result = imageMetadata(productId, image, true)!;
        await tx.outboxEvent.update({ where: { idempotencyKey: intentKey }, data: { payload: { ...intent, result } as unknown as Prisma.InputJsonValue } });
        if (current) await this.cleanupIntent(tx, productId, current.objectKey, current.id);
        await this.audit(tx, productId, current?.status === 'READY' ? 'COMMERCE_IMAGE_REPLACED' : 'COMMERCE_IMAGE_UPLOADED', context, imageId);
        return result;
      }, { timeout: 10_000 });
    } finally { clearTimeout(timer); this.activeUploads--; }
  }
  async remove(productId: string, request: FastifyRequest, context: AuditContext) {
    const product = await this.owned(productId); const { etag, operationKey } = this.mutationHeaders(request);
    if (!this.storage.isEnabled()) throw storageUnavailable();
    await this.rateLimit(request, context.actorUserId);
    const intentKey = `commerce-image:remove:${productId}:${context.actorUserId}:${operationKey}`;
    const fingerprint = this.fingerprint(etag);
    await this.prisma.$transaction(async tx => {
      const current = await this.lock(tx, productId, product.clinicId);
      const prior = await tx.outboxEvent.findUnique({ where: { idempotencyKey: intentKey } });
      if (prior) { this.replay(prior.payload as unknown as ImageIntent, fingerprint); return; }
      this.assertVersion(productId, current, etag);
      if (current?.status === 'READY') await tx.commerceProductImage.update({ where: { id: current.id }, data: { status: 'DELETE_PENDING' } });
      await this.outbox.enqueue(tx, { eventType: IMAGE_CLEANUP_EVENT, aggregateType: 'COMMERCE_PRODUCT_IMAGE', aggregateId: productId, idempotencyKey: intentKey, payload: { key: current?.objectKey ?? '', imageId: current?.id ?? '', productId, fingerprint, deadline: new Date().toISOString(), result: null } });
      await this.audit(tx, productId, 'COMMERCE_IMAGE_REMOVED', context, current?.id ?? null);
    });
  }
  async content(productId: string, imageId: string | null, request: FastifyRequest, admin = false) {
    await this.rateLimit(request, '', true);
    const where = admin ? { id: productId, clinicId: await this.clinicId() } : { id: productId, clinicId: await this.clinicId(), clinic: { status: 'ACTIVE' as const }, status: 'ACTIVE' as const, category: { isActive: true }, skus: { some: { isActive: true } } };
    const product = await this.prisma.commerceProduct.findFirst({ where, include: { image: true } });
    const image = product?.image;
    if (!image || image.status !== 'READY' || (!admin && image.id !== imageId)) throw imageMissing();
    const bytes = await this.storage.read(image.objectKey);
    // Recheck after the remote read so replacement/unpublication during I/O cannot serve stale bytes.
    const stillCurrent = await this.prisma.commerceProduct.findFirst({ where: { ...where, image: { id: image.id, status: 'READY' } }, select: { id: true } });
    if (!stillCurrent) throw imageMissing();
    return bytes;
  }
  private async cleanupIntent(tx: Prisma.TransactionClient, productId: string, key: string, imageId: string) {
    await this.outbox.enqueue(tx, { eventType: IMAGE_CLEANUP_EVENT, aggregateType: 'COMMERCE_PRODUCT_IMAGE', aggregateId: productId, idempotencyKey: `commerce-image:cleanup:${imageId}`, payload: { key, productId, imageId } });
  }
  private async audit(tx: Prisma.TransactionClient, productId: string, action: string, context: AuditContext, imageId: string | null) {
    await tx.auditEvent.create({ data: { action, actorUserId: context.actorUserId, actorSessionId: context.actorSessionId, subjectType: 'COMMERCE_PRODUCT', subjectId: productId, requestId: context.requestId.slice(0, 128), ipAddress: context.ipAddress, metadata: { imageId } } });
  }
}

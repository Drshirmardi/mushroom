import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, type CommerceProduct } from '../../../generated/prisma/client';
import type { CreateProductContentDto, ProductContentFieldsDto } from './product-content.dto';

export const CONTENT_LIMITS = { brand: 240, manufacturer: 240, shortDescription: 500, description: 5000, ingredients: 5000, usageInstructions: 5000, warnings: 5000, contraindications: 5000 } as const;
export const CONTENT_KEYS = Object.keys(CONTENT_LIMITS) as Array<keyof typeof CONTENT_LIMITS>;
export const CONTENT_BODY_LIMIT = 128 * 1024;
export type ContentRecord = Pick<CommerceProduct, keyof typeof CONTENT_LIMITS | 'contentRevision' | 'legacyContent' | 'sourceKind' | 'sourceReference' | 'approvedContentRevision' | 'contentApprovedAt' | 'contentApprovedByUserId'>;
export type ContentAuditContext = { actorUserId: string; actorSessionId: string; requestId: string; ipAddress: string };
export const contentInvalid = (fields: string[]) => new UnprocessableEntityException({ code: 'COMMERCE_CONTENT_INVALID', message: 'Product content is invalid.', details: { fields } });
export const revisionConflict = (currentRevision: number) => new ConflictException({ code: 'COMMERCE_CONTENT_REVISION_CONFLICT', message: 'Product content revision has changed.', details: { currentRevision } });

const normalize = (value: string | null, field: string, limit: number) => {
  if (value === null) return null;
  if (typeof value !== 'string') throw contentInvalid([field]);
  const normalized = value.normalize('NFKC').trim();
  if (!normalized || normalized.length > limit) throw contentInvalid([field]);
  return normalized;
};

export function normalizeContent(input: CreateProductContentDto | undefined, description?: string | null) {
  if (Buffer.byteLength(JSON.stringify({ input, description }), 'utf8') > CONTENT_BODY_LIMIT) throw new PayloadTooLargeException({ code: 'PAYLOAD_TOO_LARGE', message: 'Payload is too large.', details: {} });
  if (description !== undefined && input?.fields?.description !== undefined) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Description was supplied twice.', details: {} });
  const fields: ProductContentFieldsDto = {};
  for (const key of CONTENT_KEYS) {
    const value = key === 'description' && description !== undefined ? description : input?.fields?.[key];
    if (value !== undefined) fields[key] = normalize(value, key, CONTENT_LIMITS[key]);
  }
  const provenance = input?.provenance === undefined ? undefined : input.provenance === null ? null : {
    sourceKind: input.provenance.sourceKind,
    sourceReference: normalize(input.provenance.sourceReference, 'provenance.sourceReference', 1000)!,
  };
  return { fields, provenance };
}

export function contentFields(record: Pick<ContentRecord, keyof typeof CONTENT_LIMITS>) {
  return Object.fromEntries(CONTENT_KEYS.map((key) => [key, record[key]])) as Record<keyof typeof CONTENT_LIMITS, string | null>;
}
export function contentDigest(record: Pick<ContentRecord, keyof typeof CONTENT_LIMITS | 'sourceKind' | 'sourceReference'>) {
  return createHash('sha256').update(JSON.stringify({ ...contentFields(record), sourceKind: record.sourceKind, sourceReference: record.sourceReference })).digest('hex');
}
export function isContentApproved(record: ContentRecord) {
  return !record.legacyContent && record.approvedContentRevision === record.contentRevision && record.contentApprovedAt !== null && record.contentApprovedByUserId !== null;
}
export function adminContent(record: ContentRecord) {
  return { ...contentFields(record), contentRevision: record.contentRevision, status: record.legacyContent ? 'LEGACY_UNREVIEWED' : isContentApproved(record) ? 'APPROVED' : 'PENDING_APPROVAL', provenance: record.sourceKind === null ? null : { sourceKind: record.sourceKind, sourceReference: record.sourceReference! }, approvedContentRevision: record.approvedContentRevision, contentApprovedAt: record.contentApprovedAt?.toISOString() ?? null, contentApprovedByUserId: record.contentApprovedByUserId };
}
export function publicContent(record: ContentRecord) {
  return isContentApproved(record) ? { ...contentFields(record), contentRevision: record.contentRevision } : null;
}
export function publicContentSummary(record: ContentRecord) {
  const approved = isContentApproved(record);
  return { description: record.legacyContent || approved ? record.description : null, brand: approved ? record.brand : null, shortDescription: approved ? record.shortDescription : null };
}
export async function lockContentProduct(tx: Prisma.TransactionClient, productId: string, clinicId: string) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM commerce_products WHERE id = ${productId}::uuid AND clinic_id = ${clinicId}::uuid FOR UPDATE`);
  if (!locked.length) throw new NotFoundException({ code: 'COMMERCE_PRODUCT_NOT_FOUND', message: 'Commerce product was not found.', details: {} });
  return tx.commerceProduct.findUniqueOrThrow({ where: { id: productId } });
}
export async function auditContent(tx: Prisma.TransactionClient, productId: string, context: ContentAuditContext, action: string, before: ContentRecord | null, after: ContentRecord, changedFields: string[]) {
  await tx.auditEvent.create({ data: { ...context, action, subjectType: 'COMMERCE_PRODUCT', subjectId: productId, metadata: { previousRevision: before?.contentRevision ?? null, contentRevision: after.contentRevision, previousDigest: before ? contentDigest(before) : null, contentDigest: contentDigest(after), changedFields } } });
}
export async function saveContent(tx: Prisma.TransactionClient, current: CommerceProduct, input: CreateProductContentDto | undefined, context: ContentAuditContext, expectedRevision?: number, description?: string | null) {
  if (expectedRevision !== undefined && expectedRevision !== current.contentRevision) throw revisionConflict(current.contentRevision);
  const normalized = normalizeContent(input, description);
  const changes: Prisma.CommerceProductUncheckedUpdateInput = {};
  const changedFields: string[] = [];
  for (const key of CONTENT_KEYS) if (normalized.fields[key] !== undefined && normalized.fields[key] !== current[key]) { changes[key] = normalized.fields[key]; changedFields.push(key); }
  if (normalized.provenance !== undefined) {
    const sourceKind = normalized.provenance?.sourceKind ?? null;
    const sourceReference = normalized.provenance?.sourceReference ?? null;
    if (sourceKind !== current.sourceKind || sourceReference !== current.sourceReference) { changes.sourceKind = sourceKind; changes.sourceReference = sourceReference; changedFields.push('provenance'); }
  }
  if (!changedFields.length) return current;
  if (current.contentRevision === 2147483647) throw contentInvalid(['contentRevision']);
  // Clear the complete approval tuple in one SQL UPDATE. A nested relation
  // disconnect can issue a separate UPDATE and violate the tuple constraint.
  const after = await tx.commerceProduct.update({ where: { id: current.id }, data: { ...changes, contentRevision: { increment: 1 }, legacyContent: false, approvedContentRevision: null, contentApprovedAt: null, contentApprovedByUserId: null } });
  await auditContent(tx, current.id, context, 'COMMERCE_PRODUCT_CONTENT_UPDATED', current, after, changedFields);
  return after;
}

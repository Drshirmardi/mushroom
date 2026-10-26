import { createHash } from 'node:crypto';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

export const READY_PROGRAM_TERMS = Object.freeze({
  policyKey: 'READY_PROGRAM_PURCHASE_TERMS' as const,
  versionNumber: 1,
  title: 'شرایط خرید خدمات اختصاصی مزاج',
  body: 'با خرید این خدمت، محتوای معرفی‌شده در عنوان و توضیحات آن به حساب شما اضافه می‌شود و بدون محدودیت زمانی برای مطالعهٔ دوباره به آن دسترسی خواهید داشت.',
});
export const READY_PROGRAM_TERMS_HASH = createHash('sha256').update(READY_PROGRAM_TERMS.body, 'utf8').digest('hex');

/** Materialize the owner's fixed copy once, reusing retained purchase/consent evidence. */
export async function ensureReadyProgramTerms(tx: Prisma.TransactionClient, clinicId: string, locale: string, actorUserId: string) {
  if (locale !== 'fa-IR') throw new UnprocessableEntityException({ code: 'PROGRAM_STATIC_TERMS_LOCALE_UNSUPPORTED', message: 'Static service terms are available in Persian.', details: {} });
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'ready-program-terms:' + clinicId + ':' + locale},0))`);
  const identity = { clinicId, locale, policyKey: READY_PROGRAM_TERMS.policyKey, versionNumber: 1 };
  const existing = await tx.consentPolicyVersion.findUnique({ where: { clinicId_policyKey_locale_versionNumber: identity } });
  if (existing) {
    if (existing.status !== 'ACTIVE' || existing.contentHash !== READY_PROGRAM_TERMS_HASH || existing.body !== READY_PROGRAM_TERMS.body || !existing.activatedAt) throw new ConflictException({ code: 'PROGRAM_STATIC_TERMS_CONFLICT', message: 'Fixed service terms do not match the published version.', details: {} });
    return existing;
  }
  const [clock] = await tx.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
  return tx.consentPolicyVersion.create({ data: { ...identity, title: READY_PROGRAM_TERMS.title, body: READY_PROGRAM_TERMS.body, contentHash: READY_PROGRAM_TERMS_HASH, status: 'ACTIVE', activatedAt: clock!.now, publishedByUserId: actorUserId } });
}

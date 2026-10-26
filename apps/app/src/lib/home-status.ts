import type { PatientJourney } from './patient-journey-api';
import { journeyActionLink } from './patient-journey-api';
import { journeyActionDescription } from './home-journey';
import { billingPurposeLabel } from './wallet-labels';
import { formatRial } from './wallet-money';

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

/** Only show authored result text; no inferred diagnosis, score or synthetic progress. */
export function homeResultSummary(snapshot: unknown) {
  const value = object(snapshot);
  if (value.algorithmId === 'DIMENSION_TIEBREAK') {
    if (!['SINGLE', 'PAIR'].includes(text(value.status))) return { title: 'نتیجه به بررسی بیشتر نیاز دارد', description: 'الگوی پاسخ‌ها هنوز گرایش مشخصی نشان نمی‌دهد. جزئیات ثبت‌شده را در نتیجه ببینید.' };
    const profile = object(value.profile);
    return { title: text(profile.title) || 'نتیجهٔ ارزیابی شما ثبت شده', description: 'خلاصهٔ آموزشیِ الگوی پاسخ‌های شما؛ جزئیات و راهنمای موجود در صفحهٔ نتیجه است.' };
  }
  const band = object(value.resultBand);
  return { title: band.requiresReview === true ? 'نتیجه نیاز به بررسی درمانگر دارد' : text(band.title) || 'نتیجهٔ ارزیابی شما ثبت شده', description: 'نتیجهٔ آموزشیِ ثبت‌شدهٔ شما در دسترس است. برای مشاهدهٔ جزئیات و راهنمای موجود، نتیجه را باز کنید.' };
}

export function homePendingAction(action: PatientJourney['home']['actions'][number]) {
  const { code, resourceId } = action;
  const id = encodeURIComponent(resourceId ?? '');
  if (code === 'TRACK_ORDER') return { href: `/store/order-tracking?orderId=${id}`, title: 'پیگیری سفارش فروشگاه', description: 'سفارش در انتظار پرداخت است؛ آخرین وضعیت را بررسی کنید.' };
  if (code === 'OPEN_COUPLE_LINK') return { href: `/assessment/couples/links/${id}`, title: 'تکمیل اتصال همراه', description: 'وضعیت دعوت و رضایت مستقل همراه را بررسی کنید.' };
  const link = journeyActionLink({ code, resourceId });
  if (code === 'CONTINUE_PAYMENT' && action.amountRial !== null) return {
    href: link.href, title: billingPurposeLabel(action.paymentPurpose ?? ''),
    description: `${formatRial(BigInt(action.amountRial))} تومان در انتظار پرداخت؛ روش‌های در دسترس را ببینید.`,
  };
  return { href: link.href, title: action.title || link.label, description: journeyActionDescription(code) };
}

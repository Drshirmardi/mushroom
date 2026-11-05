export const ANALYTICS_CONTEXT = 'ANALYTICS_CONTEXT';
export const ANALYTICS_DELIVERY = 'ANALYTICS_DELIVERY';
export const ANALYTICS_TTL_MS = 24 * 60 * 60 * 1000;
export type AnalyticsContext = {
  consent: 'granted'; measurement_id: string; client_id: string; session_id: string;
  at: number; entry_cta?: string; source?: string; medium?: string; campaign?: string;
};
export type AnalyticsEvent = 'purchase' | 'refund' | 'sign_up' | 'assessment_completed' | 'booking_confirmed' | 'service_paid';
export type AnalyticsDelivery = {
  context: AnalyticsContext; event: AnalyticsEvent; occurredAt: number; expiresAt: number;
  transactionId?: string; amountRial?: string; items?: Array<{ item_id: string; quantity: number }>;
};
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function parseAnalyticsContext(raw: unknown, measurementId: string, now = Date.now(), maxAge = 30 * 60 * 1000): AnalyticsContext | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > 1024) return null;
    try { value = JSON.parse(raw); } catch { return null; }
  }
  if (!object(value) || value.consent !== 'granted' || value.measurement_id !== measurementId || !/^G-[A-Z0-9]+$/.test(measurementId)) return null;
  if (typeof value.client_id !== 'string' || !/^\d{1,20}\.\d{1,20}$/.test(value.client_id) || typeof value.session_id !== 'string' || !/^\d{10}$/.test(value.session_id)) return null;
  const startedAt = Number(value.session_id) * 1000;
  if (startedAt > now + 5 * 60 * 1000 || startedAt + ANALYTICS_TTL_MS <= now || typeof value.at !== 'number' || !Number.isFinite(value.at) || value.at > now + 5 * 60 * 1000 || now - value.at > maxAge) return null;
  const result: AnalyticsContext = { consent: 'granted', measurement_id: measurementId, client_id: value.client_id, session_id: value.session_id, at: value.at };
  for (const field of ['entry_cta', 'source', 'medium', 'campaign'] as const) {
    const part = value[field];
    if (typeof part === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(part)) result[field] = part;
  }
  return result;
}

export function analyticsDeadline(context: AnalyticsContext, occurredAt: number) {
  return Math.min(occurredAt + ANALYTICS_TTL_MS, context.at + ANALYTICS_TTL_MS, Number(context.session_id) * 1000 + ANALYTICS_TTL_MS);
}

export function measurementPayload(value: unknown, measurementId: string, now = Date.now()) {
  if (!object(value)) return null;
  const context = parseAnalyticsContext(value.context, measurementId, now, ANALYTICS_TTL_MS);
  if (!context || typeof value.occurredAt !== 'number' || !Number.isSafeInteger(value.occurredAt) || value.occurredAt > now + 5 * 60 * 1000 || value.occurredAt < Number(context.session_id) * 1000 || now >= analyticsDeadline(context, value.occurredAt)) return null;
  if (!['purchase', 'refund', 'sign_up', 'assessment_completed', 'booking_confirmed', 'service_paid'].includes(String(value.event))) return null;
  const params: Record<string, unknown> = { session_id: context.session_id, schema_version: 1 };
  for (const field of ['entry_cta', 'source', 'medium', 'campaign'] as const) if (context[field]) params[field] = context[field]!;
  if (value.event === 'purchase' || value.event === 'refund') {
    if (typeof value.transactionId !== 'string' || !uuid.test(value.transactionId)) return null;
    params.transaction_id = value.transactionId;
    if (Array.isArray(value.items)) params.items = value.items.slice(0, 100).flatMap(item => {
      if (!object(item) || typeof item.item_id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.item_id) || typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) return [];
      return [{ item_id: item.item_id, quantity: item.quantity }];
    });
    // IRR is not supported by GA4's standard revenue metrics. Never relabel it USD.
    if (typeof value.amountRial !== 'string' || !/^[1-9]\d{0,18}$/.test(value.amountRial)) return null;
    const amount = Number(value.amountRial);
    if (Number.isSafeInteger(amount)) params.amount_rial = amount;
    else params.amount_rial_text = value.amountRial;
  }
  return { client_id: context.client_id, timestamp_micros: value.occurredAt * 1000, consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' }, events: [{ name: value.event as AnalyticsEvent, params }] };
}

export function retryDelay(attempt: number) { return Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.max(0, Math.min(attempt - 1, 6))); }

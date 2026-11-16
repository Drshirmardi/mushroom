export type AnalyticsContext = {
  at: number; source?: string; medium?: string; campaign?: string;
  entry_cta?: string; client_id?: string; session_id?: string;
  measurement_id?: string;
  referrer_origin?: string;
};
const CONTEXT_TTL = 30 * 60 * 1000;
const contextFields = ['source', 'medium', 'campaign', 'entry_cta', 'client_id', 'session_id', 'measurement_id', 'referrer_origin'] as const;

export function captureContext(url: URL, stored: AnalyticsContext | null, now = Date.now()): AnalyticsContext {
  const incomingAt = Number(url.searchParams.get('ma_at'));
  const incoming = incomingAt > 0 && incomingAt <= now && now - incomingAt <= CONTEXT_TTL;
  const validStored = stored && Number.isFinite(stored.at) && stored.at <= now && now - stored.at <= CONTEXT_TTL;
  const result: AnalyticsContext = { at: incoming ? incomingAt : validStored ? stored.at : now };
  for (const field of contextFields) {
    const raw = incoming ? url.searchParams.get(`ma_${field}`) : validStored ? stored[field] : null;
    const value = field === 'source' || field === 'medium' || field === 'campaign'
      ? url.searchParams.get(`utm_${field}`) ?? raw : raw;
    if (field === 'referrer_origin') {
      try { const referrer = new URL(String(value));
        if (referrer.protocol === 'https:' && referrer.origin === value && value.length <= 200) result[field] = value;
      } catch { /* Only an origin, never its path/query, may survive. */ }
      continue;
    }
    const pattern = field === 'client_id' ? /^\d{1,20}\.\d{1,20}$/ : field === 'session_id' ? /^\d{1,20}$/ : field === 'measurement_id' ? /^G-[A-Z0-9]+$/ : /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
    if (typeof value === 'string' && pattern.test(value)) result[field] = value;
  }
  return result;
}

export function appendContext(url: URL, context: AnalyticsContext): URL {
  const result = new URL(url);
  for (const key of [...result.searchParams.keys()]) if (key.startsWith('ma_')) result.searchParams.delete(key);
  result.searchParams.set('ma_at', String(context.at));
  for (const field of contextFields) {
    if (context[field]) result.searchParams.set(`ma_${field}`, context[field]!);
  }
  return result;
}

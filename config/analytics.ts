export type AnalyticsEvent = 'page_view' | 'cta_click';
export type AnalyticsParams = Readonly<Record<string, unknown>>;
export type AnalyticsAdapter = (event: AnalyticsEvent, params: AnalyticsParams) => void;

const sections = new Set(['store', 'profile', 'assessment', 'appointments', 'programs', 'treatment', 'trackers', 'chat', 'articles', 'notifications', 'doctors', 'guidance', 'welcome', 'onboarding', 'login', 'signup', 'mezaj']);
const staticSegments = new Set(['store', 'products', 'cart', 'wishlist', 'orders', 'payment', 'order-success', 'order-tracking', 'profile', 'history', 'wallet', 'pay', 'payment-result', 'security', 'addresses', 'edit', 'medical', 'health-record', 'assessment', 'result', 'resume', 'couples', 'marriage', 'educational', 'offerings', 'purchases', 'appointments', 'book', 'confirm', 'success', 'summary', 'waiting-room', 'assessment-sharing', 'programs', 'custom', 'custom-offerings', 'versions', 'treatment', 'sessions', 'progress', 'meds', 'exercises', 'trackers', 'pain', 'mood', 'chat', 'articles', 'notifications', 'doctors', 'guidance', 'welcome', 'onboarding', 'login', 'signup', 'mezaj']);

export function logicalPage(path: string): string {
  const parts = path.split(/[?#]/)[0].split('/').filter(Boolean);
  if (['fa', 'en', 'ar', 'zh-CN'].includes(parts[0])) parts.shift();
  if (!parts.length) return '/landing';
  if (!sections.has(parts[0])) return '/other';
  return '/' + parts.map(part => staticSegments.has(part) ? part : ':id').join('/');
}

export function createAnalytics(send: AnalyticsAdapter) {
  let enabled = false;
  let previous = '';
  function track(event: AnalyticsEvent, input: AnalyticsParams = {}) {
    if (!enabled) return;
    const params: Record<string, unknown> = { schema_version: 1 };
    for (const key of ['page_path', 'action_id', 'section_id', 'surface', 'language']) {
      const value = input[key];
      if (typeof value === 'string' && /^[a-zA-Z0-9_/:.-]{1,100}$/.test(value)) params[key] = value;
    }
    try { send(event, params); } catch { /* Analytics cannot interrupt product actions. */ }
  }
  return {
    setEnabled(value: boolean) { enabled = value; if (!value) previous = ''; },
    track,
    page(path: string, surface = 'app') {
      const page = surface === 'app' && path.split(/[?#]/)[0] === '/' ? '/home' : logicalPage(path);
      const identity = path.split(/[?#]/)[0];
      if (!enabled || previous === identity) return;
      previous = identity;
      track('page_view', { page_path: page, surface });
    },
  };
}

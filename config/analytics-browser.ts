import { createAnalytics, logicalPage } from './analytics';
import { appendContext, captureContext, type AnalyticsContext } from './analytics-context';
import { analyticsOperation, observeOperation } from './analytics-operations';
import type { AnalyticsEvent, AnalyticsParams } from './analytics';

type AnalyticsWindow = Window & {
  __MUSHROOM_RUNTIME_CONFIG__?: Readonly<Record<string, string>>;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

// Singleton survives StrictMode remounts. No browser globals are touched during SSR.
let analytics: ReturnType<typeof createAnalytics> | undefined;
let initializedId: string | undefined;
let context: AnalyticsContext | null = null;
const contextKey = 'mushroom.analytics.context';

function permitted() {
  if (typeof window === 'undefined') return false;
  const config = (window as AnalyticsWindow).__MUSHROOM_RUNTIME_CONFIG__;
  try {
    return (!initializedId || initializedId === config?.analyticsMeasurementId) && /^G-[A-Z0-9]+$/.test(config?.analyticsMeasurementId || '') && config?.analyticsConsent === 'granted' && localStorage.getItem('mushroom.analytics') !== 'denied';
  } catch { return false; }
}
function rememberContext() {
  try { sessionStorage.setItem(contextKey, JSON.stringify(context)); } catch { /* Storage is optional. */ }
}

export function browserAnalyticsEvent(event: AnalyticsEvent, params: AnalyticsParams = {}) {
  if (!permitted()) {
    if (initializedId && typeof window !== 'undefined') (window as unknown as Record<string, unknown>)[`ga-disable-${initializedId}`] = true;
    analytics?.setEnabled(false); context = null; return;
  }
  analytics?.track(event, { source: context?.source, medium: context?.medium, campaign: context?.campaign,
    entry_cta: context?.entry_cta, page_path: params.surface === 'app' && location.pathname === '/' ? '/home' : logicalPage(location.pathname), language: document.documentElement.lang, ...params });
}

export function observeBrowserInteractions(path: string, surface: 'web' | 'app') {
  if (!permitted()) return () => {};
  const page = surface === 'app' && path === '/' ? '/home' : logicalPage(path);
  let visibleSince: number | null = document.visibilityState === 'visible' ? performance.now() : null;
  const flush = () => {
    if (visibleSince === null) return;
    const duration = performance.now() - visibleSince;
    visibleSince = null;
    if (duration >= 1000) browserAnalyticsEvent('feature_engagement', { page_path: page, duration_ms: duration, surface });
  };
  const visibility = () => { flush(); if (document.visibilityState === 'visible') visibleSince = performance.now(); };
  const click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const action = target?.closest<HTMLElement>('[data-analytics-action]');
    if (action) {
      trackBrowserAction(action.dataset.analyticsAction!, action.closest('section')?.id || 'header', surface);
      const anchor = action.closest<HTMLAnchorElement>('a[href]');
      const appOrigin = (window as AnalyticsWindow).__MUSHROOM_RUNTIME_CONFIG__?.appUrl;
      if (surface === 'web' && anchor && appOrigin) anchor.href = decorateAnalyticsUrl(anchor.href, appOrigin);
      return;
    }
    const link = target?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    try {
      const destination = new URL(link.href);
      const runtime = (window as AnalyticsWindow).__MUSHROOM_RUNTIME_CONFIG__;
      const origins = [location.origin, runtime?.appUrl, runtime?.webUrl].filter(Boolean).map(value => new URL(value!).origin);
      if (origins.includes(destination.origin) && destination.pathname !== location.pathname) browserAnalyticsEvent('navigation_click', { page_path: page, action_id: logicalPage(destination.pathname), surface });
    } catch { /* Non-web links are not observed. */ }
  };
  const seen = new WeakSet<Element>();
  const impressions = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || seen.has(entry.target)) continue;
      seen.add(entry.target); impressions?.unobserve(entry.target);
      const target = entry.target as HTMLElement;
      browserAnalyticsEvent('cta_impression', { action_id: target.dataset.analyticsAction, section_id: target.closest('section')?.id || 'header', page_path: page, surface });
    }
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-analytics-action]').forEach(element => impressions?.observe(element));
  // Capture runs before a React handler redirects or opens the login dialog.
  document.addEventListener('click', click, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', flush);
  return () => {
    flush(); impressions?.disconnect();
    document.removeEventListener('click', click, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', flush);
  };
}

export function decorateAnalyticsUrl(candidate: string, allowedAppOrigin: string): string {
  if (!permitted() || !context) return candidate;
  try {
    const destination = new URL(candidate);
    if (destination.origin !== new URL(allowedAppOrigin).origin || destination.username || destination.password) return candidate;
    return appendContext(destination, captureContext(new URL(location.origin), context)).toString();
  } catch { return candidate; }
}

export function analyticsFetch(input: RequestInfo | URL, init: RequestInit | undefined,
  run: () => Promise<Response>, apiOrigin: string, surface: 'web' | 'app') {
  let operation: string | undefined;
  let itemId: string | undefined;
  if (permitted()) {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
      if (url.origin === new URL(apiOrigin).origin) {
        operation = analyticsOperation(init?.method || (input instanceof Request ? input.method : 'GET'), url.pathname);
        if (operation === 'product_load') {
          const id = url.pathname.split('/').pop() || '';
          if (/^[a-f0-9-]{36}$/i.test(id)) itemId = id;
        }
      }
    } catch { /* Invalid product inputs are handled by its existing transport. */ }
  }
  return observeOperation(operation, run, (event, params) => browserAnalyticsEvent(event, { ...params, item_id: itemId, surface }));
}

export function trackBrowserPage(path: string, surface: 'web' | 'app') {
  const host = window as AnalyticsWindow;
  const config = host.__MUSHROOM_RUNTIME_CONFIG__;
  const id = config?.analyticsMeasurementId;
  let allowed = config?.analyticsConsent === 'granted';
  try { if (localStorage.getItem('mushroom.analytics') === 'denied') allowed = false; } catch { allowed = false; }
  if (!id || !/^G-[A-Z0-9]+$/.test(id) || !allowed || initializedId && initializedId !== id) {
    if (initializedId) (host as unknown as Record<string, unknown>)[`ga-disable-${initializedId}`] = true;
    analytics?.setEnabled(false);
    context = null;
    try { sessionStorage.removeItem(contextKey); } catch { /* Optional storage. */ }
    return;
  }
  (host as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
  if (initializedId && initializedId !== id) return; // Runtime destination changes apply on reload.
  if (!context) {
    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem(contextKey) || 'null'); } catch { /* Corrupt storage is ignored. */ }
    context = captureContext(new URL(location.href), stored);
    if (!context.referrer_origin && !context.source && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        const internal = [location.origin, config?.appUrl, config?.webUrl].filter(Boolean).map(value => new URL(value!).origin);
        if (referrer.protocol === 'https:' && !internal.includes(referrer.origin)) context.referrer_origin = referrer.origin;
      } catch { /* Invalid referrers are ignored. */ }
    }
    if (context.measurement_id !== id) { delete context.client_id; delete context.session_id; }
    context.measurement_id = id;
    rememberContext();
    // Remove handoff metadata without touching product query parameters or fragments.
    const clean = new URL(location.href);
    for (const key of [...clean.searchParams.keys()]) if (key.startsWith('ma_')) clean.searchParams.delete(key);
    if (clean.href !== location.href) history.replaceState(history.state, '', clean.pathname + clean.search + clean.hash);
  }
  if (!initializedId) {
    host.dataLayer ??= [];
    let loaded = false;
    host.gtag = function () { if (loaded || host.dataLayer!.length < 100) host.dataLayer!.push(arguments); };
    host.gtag('js', new Date());
    host.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      ...(context.client_id ? { client_id: context.client_id } : {}), ...(context.session_id ? { session_id: context.session_id } : {}),
      campaign_source: context.source, campaign_medium: context.medium, campaign_name: context.campaign,
      page_location: `${location.origin}${surface === 'app' && path === '/' ? '/home' : logicalPage(path)}`, page_title: 'Mushroom', page_referrer: context.referrer_origin || '' });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.onload = () => {
      loaded = true;
      for (const field of ['client_id', 'session_id'] as const) host.gtag?.('get', id, field, (value: unknown) => {
        if (!permitted() || !context || typeof value !== 'string' && typeof value !== 'number') return;
        const validated = captureContext(new URL(location.origin), { ...context, [field]: String(value) });
        context = validated; rememberContext();
      });
    };
    document.head.append(script);
    initializedId = id;
    analytics = createAnalytics((event, params) => {
      host.gtag?.('event', event, { source: context?.source, medium: context?.medium, campaign: context?.campaign, entry_cta: context?.entry_cta, ...params, send_to: id,
        page_location: `${location.origin}${params.page_path || logicalPage(location.pathname)}`,
        page_title: 'Mushroom', page_referrer: context?.referrer_origin || '' });
    });
  }
  analytics!.setEnabled(true);
  analytics!.page(path, surface);
}

export function trackBrowserAction(action: string, section: string, surface: 'web' | 'app') {
  // Check opt-out at send time, not just when the route mounted.
  try { if (localStorage.getItem('mushroom.analytics') === 'denied') {
    if (initializedId) (window as unknown as Record<string, unknown>)[`ga-disable-${initializedId}`] = true;
    analytics?.setEnabled(false); return;
  } } catch { return; }
  if (surface === 'web' && permitted() && context && /^[a-zA-Z0-9_-]{1,64}$/.test(`${section}_${action}`)) {
    context.entry_cta ??= `${section}_${action}`;
    rememberContext();
  }
  browserAnalyticsEvent('cta_click', { action_id: action, section_id: section, surface,
    language: document.documentElement.lang, page_path: logicalPage(location.pathname) });
}

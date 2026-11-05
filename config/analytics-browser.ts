import { createAnalytics, logicalPage } from './analytics';

type AnalyticsWindow = Window & {
  __MUSHROOM_RUNTIME_CONFIG__?: Readonly<Record<string, string>>;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

// Singleton survives StrictMode remounts. No browser globals are touched during SSR.
let analytics: ReturnType<typeof createAnalytics> | undefined;
let initializedId: string | undefined;

export function trackBrowserPage(path: string, surface: 'web' | 'app') {
  const host = window as AnalyticsWindow;
  const config = host.__MUSHROOM_RUNTIME_CONFIG__;
  const id = config?.analyticsMeasurementId;
  let allowed = config?.analyticsConsent === 'granted';
  try { if (localStorage.getItem('mushroom.analytics') === 'denied') allowed = false; } catch { allowed = false; }
  if (!id || !/^G-[A-Z0-9]+$/.test(id) || !allowed) {
    if (initializedId) (host as unknown as Record<string, unknown>)[`ga-disable-${initializedId}`] = true;
    analytics?.setEnabled(false);
    return;
  }
  (host as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
  if (initializedId && initializedId !== id) return; // Runtime destination changes apply on reload.
  if (!initializedId) {
    host.dataLayer ??= [];
    let loaded = false;
    host.gtag = function () { if (loaded || host.dataLayer!.length < 100) host.dataLayer!.push(arguments); };
    host.gtag('js', new Date());
    host.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: `${location.origin}${logicalPage(path)}`, page_title: 'Mushroom', page_referrer: '' });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.onload = () => { loaded = true; };
    document.head.append(script);
    initializedId = id;
    analytics = createAnalytics((event, params) => {
      host.gtag?.('event', event, { ...params, send_to: id,
        page_location: `${location.origin}${params.page_path || logicalPage(location.pathname)}`,
        page_title: 'Mushroom', page_referrer: '' });
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
  analytics?.track('cta_click', { action_id: action, section_id: section, surface,
    language: document.documentElement.lang, page_path: logicalPage(location.pathname) });
}

import { normalizeSadadCallbackUrl } from '../../../config/sadad-callback-url';
import { buildSadadRedirect, type SadadRedirectProfile } from './sadad-payment-provider.adapter';

export const SADAD_START_PATH = '/v1/payments/providers/sadad/start';

export function buildSadadStartUrl(returnUrl: string, token: string): string {
  const url = new URL(SADAD_START_PATH, normalizeSadadCallbackUrl(returnUrl));
  // Fragments never enter proxy/API access logs or the outgoing Referer.
  url.hash = encodeURIComponent(token);
  return url.toString();
}

export function sadadStartDocument(profile: SadadRedirectProfile, nonce: string): string {
  const target = buildSadadRedirect(profile, 'SADAD_BROWSER_TOKEN');
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="origin"><title>انتقال به درگاه سداد</title></head><body><main><h1>انتقال به درگاه سداد</h1><p id="status" role="status">در حال اتصال به درگاه پرداخت…</p><noscript>برای ادامهٔ پرداخت، جاوااسکریپت مرورگر را فعال کنید.</noscript><a id="continue" hidden>ادامهٔ پرداخت در سداد</a></main><script nonce="${nonce}">
try {
  const token = decodeURIComponent(location.hash.slice(1));
  history.replaceState(null, '', location.pathname);
  if (!token || token.length > 512 || /[\\u0000-\\u0020\\u007f]/.test(token)) throw Error('Invalid token');
  const destination = ${JSON.stringify(target)}.replace('SADAD_BROWSER_TOKEN', encodeURIComponent(token));
  const link = document.getElementById('continue');
  link.href = destination;
  link.hidden = false;
  location.replace(destination);
} catch {
  document.getElementById('status').textContent = 'پیوند پرداخت معتبر نیست؛ به برنامه برگردید و دوباره ادامهٔ پرداخت را بزنید.';
}
</script></body></html>`;
}

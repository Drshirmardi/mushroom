'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, Smartphone } from 'lucide-react';
import type { Authentication } from '@/auth/session';
import { acceptBaleAuthentication } from '@/components/auth/session-gate';
import { apiBaseUrl, baleSessionHeaders } from '@/lib/api';
import { BALE_SDK_URL, balePaymentResultHref } from '@/lib/bale-payment';

interface BaleWebApp {
  initData: string;
  isMiniAppSupported?: boolean;
  colorScheme?: 'light' | 'dark';
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
    section_separator_color?: string;
    destructive_text_color?: string;
  };
  ready(): void;
  expand?(): void;
  requestContact?(callback: (accepted: boolean, phone?: string) => void): void;
}
declare global {
  interface Window {
    Bale?: { WebApp?: BaleWebApp };
  }
}

type BaleThemeColors = {
  background: string;
  surface: string;
  text: string;
  hint: string;
  border: string;
  accent: string;
  buttonText: string;
  danger: string;
};

const LIGHT_THEME: BaleThemeColors = {
  background: '#fcfdfd',
  surface: '#fafbfc',
  text: '#091e42',
  hint: '#7a869a',
  border: '#ebecf0',
  accent: '#00b894',
  buttonText: '#ffffff',
  danger: '#e82a3c',
};
const DARK_THEME: BaleThemeColors = {
  background: '#151617',
  surface: '#1a1b1c',
  text: '#ffffff',
  hint: '#b3bac5',
  border: '#36373b',
  accent: '#00b894',
  buttonText: '#ffffff',
  danger: '#ff5858',
};

function getBaleTheme(webApp: BaleWebApp | undefined, systemPrefersDark: boolean): BaleThemeColors {
  const defaults =
    webApp?.colorScheme === 'dark' || (webApp?.colorScheme !== 'light' && systemPrefersDark)
      ? DARK_THEME
      : LIGHT_THEME;
  const params = webApp?.themeParams;
  const validColor = (value: string | undefined, fallback: string) =>
    value && /^#[\da-f]{6}$/iu.test(value) ? value : fallback;

  return {
    background: validColor(params?.bg_color, defaults.background),
    surface: validColor(params?.secondary_bg_color, defaults.surface),
    text: validColor(params?.text_color, defaults.text),
    hint: validColor(params?.hint_color, defaults.hint),
    border: validColor(params?.section_separator_color, defaults.border),
    accent: validColor(params?.button_color ?? params?.link_color, defaults.accent),
    buttonText: validColor(params?.button_text_color, defaults.buttonText),
    danger: validColor(params?.destructive_text_color, defaults.danger),
  };
}

type BaleFlow =
  | { status: 'AUTHENTICATED'; authentication: Authentication }
  | { status: 'ACCOUNT_LINK_REQUIRED'; phone: string }
  | { status: 'CONTACT_REQUIRED' | 'CONTACT_PENDING' };
type BaleRequest = { status: 'CONTACT_REQUIRED'; ticket: string; expiresAt: string };
type OtpChallenge = { challengeId: string; destinationMasked: string; expiresAt: string };
type View = 'opening' | 'contact' | 'waiting' | 'phone' | 'code' | 'unsupported-account' | 'error';
const isUnsupportedAccount = (error: unknown) =>
  error instanceof Error && error.message === 'BALE_ACCOUNT_UNSUPPORTED';

async function apiPost<T>(
  path: string,
  body: object,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/v1/${path}`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...baleSessionHeaders(), ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new Error(error?.code || `HTTP_${response.status}`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Public mini-app entrypoint: it never navigates to apps/web. */
export default function BaleMiniAppPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('opening');
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [baleSdkReady, setBaleSdkReady] = useState(false);
  const [themeColors, setThemeColors] = useState(LIGHT_THEME);
  const initData = useRef('');
  const opening = useRef(false);

  const finish = useCallback(
    (authentication: Authentication) => {
      acceptBaleAuthentication(authentication);
      const params = new URLSearchParams(window.location.search);
      const startParam = params.get('paymentReturn') ?? params.get('tgWebAppStartParam')
        ?? new URLSearchParams(initData.current).get('start_param');
      router.replace(balePaymentResultHref(startParam) ?? '/');
    },
    [router],
  );

  const openBale = useCallback(async () => {
    if (opening.current) return;
    opening.current = true;
    setView('opening');
    setError('');
    try {
      const webApp = window.Bale?.WebApp;
      if (webApp) {
        setThemeColors(
          getBaleTheme(webApp, window.matchMedia('(prefers-color-scheme: dark)').matches),
        );
        setBaleSdkReady(true);
      }
      if (!webApp?.initData) throw new Error('BALE_CONTEXT_MISSING');
      const authDate = new URLSearchParams(webApp.initData).get('auth_date');
      if (authDate && Math.floor(Date.now() / 1000) - Number(authDate) > 600) {
        setError('برای ادامه، مینی‌اپ را دوباره از بله باز کنید.');
        setView('error');
        return;
      }
      initData.current = webApp.initData;
      window.sessionStorage.setItem('mushroom:bale-miniapp', '1');
      webApp.ready();
      setCanExpand(typeof webApp.expand === 'function');
      const result = await apiPost<BaleFlow>('auth/bale/exchange', { initData: initData.current });
      if (result.status === 'AUTHENTICATED') finish(result.authentication);
      else setView('contact');
    } catch {
      setError('ارتباط امن با بله برقرار نشد. مینی‌اپ را از داخل بله دوباره باز کنید.');
      setView('error');
    } finally {
      opening.current = false;
    }
  }, [finish]);

  useEffect(() => {
    if (!baleSdkReady) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => setThemeColors(getBaleTheme(window.Bale?.WebApp, media.matches));
    media.addEventListener('change', syncTheme);
    window.addEventListener('focus', syncTheme);
    document.addEventListener('visibilitychange', syncTheme);
    return () => {
      media.removeEventListener('change', syncTheme);
      window.removeEventListener('focus', syncTheme);
      document.removeEventListener('visibilitychange', syncTheme);
    };
  }, [baleSdkReady]);

  const requestContact = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const webApp = window.Bale?.WebApp;
      if (!webApp?.requestContact) throw new Error('UNSUPPORTED');
      const response = await apiPost<BaleRequest>('auth/bale/contact/request', {
        initData: initData.current,
      });
      setTicket(response.ticket);
      webApp.requestContact((accepted) => {
        setView(accepted ? 'waiting' : 'contact');
        if (!accepted) setError('برای ادامه، شماره تلفن خود را در بله تأیید کنید.');
      });
    } catch {
      setError('درخواست شماره انجام نشد. نسخه بله یا ارتباط شبکه را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (view !== 'waiting' || !ticket) return;
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const result = await apiPost<BaleFlow>('auth/bale/contact/complete', {
          initData: initData.current,
          ticket,
        });
        if (cancelled) return;
        if (result.status === 'AUTHENTICATED') finish(result.authentication);
        else if (result.status === 'ACCOUNT_LINK_REQUIRED') {
          setPhone(result.phone);
          setView('phone');
        }
      } catch (failure) {
        if (!cancelled) {
          if (isUnsupportedAccount(failure)) {
            setView('unsupported-account');
            return;
          }
          setError('تأیید شماره کامل نشد یا زمان درخواست پایان یافت. دوباره تلاش کنید.');
          setView('error');
        }
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [view, ticket, finish]);

  const requestOtp = async () => {
    if (busy || !phone.trim()) return;
    setBusy(true);
    setError('');
    try {
      const challenge = await apiPost<OtpChallenge>(
        'auth/otp/challenges',
        { phone, remember: true },
        { 'idempotency-key': crypto.randomUUID() },
      );
      setChallenge(challenge);
      setView('code');
    } catch {
      setError('ارسال کد به شماره‌ی تأییدشده ممکن نشد. کمی بعد دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtpAndLink = async () => {
    if (busy || !challenge || !/^\d{4,8}$/u.test(code)) return;
    setBusy(true);
    setError('');
    try {
      const authentication = await apiPost<Authentication>(
        `auth/otp/challenges/${encodeURIComponent(challenge.challengeId)}/verify`,
        { code },
      );
      try {
        // The authenticated OTP session must match the phone verified by Bale's bot.
        await apiPost<void>(
          'auth/bale/contact/link',
          { initData: initData.current, ticket },
          { authorization: `Bearer ${authentication.accessToken}` },
        );
        finish(authentication);
      } catch (failure) {
        if (isUnsupportedAccount(failure)) {
          setView('unsupported-account');
        } else {
          setError('تأیید انجام شد، اما اتصال حساب کامل نشد. دوباره از بله وارد شوید.');
        }
      }
    } catch {
      setError('کد معتبر نبود یا زمان آن تمام شده است. کد تازه بگیرید و دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="min-h-dvh bg-[var(--bale-background)] px-4 py-6 text-[var(--bale-text)] sm:px-6 sm:py-10"
      dir="rtl"
      style={
        {
          '--bale-background': themeColors.background,
          '--bale-surface': themeColors.surface,
          '--bale-text': themeColors.text,
          '--bale-hint': themeColors.hint,
          '--bale-border': themeColors.border,
          '--bale-accent': themeColors.accent,
          '--bale-button-text': themeColors.buttonText,
          '--bale-danger': themeColors.danger,
        } as CSSProperties
      }
    >
      <Script
        src={BALE_SDK_URL}
        strategy="afterInteractive"
        onReady={() => {
          void openBale();
        }}
        onError={() => {
          setError('دریافت ابزار ارتباطی بله ناموفق بود.');
          setView('error');
        }}
      />
      <section
        aria-busy={view === 'opening' || view === 'waiting' || busy}
        className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-[var(--bale-border)] bg-[var(--bale-surface)] px-5 py-6 text-center sm:px-8"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--bale-accent)_12%,var(--bale-surface))] text-[var(--bale-accent)]">
          {view === 'opening' || view === 'waiting' ? (
            <LoaderCircle className="size-8 animate-spin" />
          ) : view === 'code' ? (
            <ShieldCheck className="size-8" />
          ) : (
            <Smartphone className="size-8" />
          )}
        </div>
        <h1 className="text-xl font-bold leading-8 text-[var(--bale-text)] sm:text-2xl">
          ورود با بله
        </h1>
        {view === 'opening' && (
          <p className="text-sm leading-7 text-[var(--bale-hint)]">در حال بررسی حساب شما…</p>
        )}
        {view === 'contact' && (
          <>
            <p className="text-sm leading-7 text-[var(--bale-hint)]">
              برای ورود، شماره‌تان را در بله تأیید کنید.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestContact()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--bale-accent)] px-5 py-3 font-semibold text-[var(--bale-button-text)] transition-[filter] hover:brightness-95 active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bale-accent)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? 'لطفاً صبر کنید…' : 'تأیید شماره در بله'} <ArrowLeft size={18} />
            </button>
          </>
        )}
        {view === 'waiting' && (
          <p className="text-sm leading-7 text-[var(--bale-hint)]">
            در حال دریافت تأیید امن شماره هستیم. لطفاً این صفحه را باز نگه دارید.
          </p>
        )}
        {view === 'phone' && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--bale-text)]">
              <CheckCircle2 className="size-5 text-[var(--bale-accent)]" /> شماره‌ی شما تأیید شد.
            </div>
            <p className="text-sm leading-7 text-[var(--bale-hint)]">
              برای اتصال حساب، کد ورود را به همین شماره می‌فرستیم.
            </p>
            <label className="w-full text-right text-sm font-medium text-[var(--bale-text)]">
              شماره تأییدشده
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--bale-border)] bg-[var(--bale-background)] px-4 text-left text-[var(--bale-text)] outline-none focus:border-[var(--bale-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--bale-accent)_20%,transparent)]"
                dir="ltr"
                type="tel"
                autoComplete="tel"
                value={phone}
                readOnly
                aria-readonly="true"
              />
            </label>
            <button
              className="min-h-12 w-full rounded-xl bg-[var(--bale-accent)] px-5 py-3 font-semibold text-[var(--bale-button-text)] transition-[filter] hover:brightness-95 active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bale-accent)] disabled:cursor-not-allowed disabled:opacity-55"
              type="button"
              disabled={busy || !phone.trim()}
              onClick={() => void requestOtp()}
            >
              ارسال کد تأیید
            </button>
          </>
        )}
        {view === 'code' && (
          <>
            <p className="text-sm leading-7 text-[var(--bale-hint)]">
              کد ارسال‌شده به {challenge?.destinationMasked} را وارد کنید.
            </p>
            <label className="w-full text-right text-sm font-medium text-[var(--bale-text)]">
              کد پیامکی
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--bale-border)] bg-[var(--bale-background)] px-4 text-center text-[var(--bale-text)] outline-none focus:border-[var(--bale-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--bale-accent)_20%,transparent)]"
                type="text"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </label>
            <button
              type="button"
              disabled={busy || !/^\d{4,8}$/u.test(code)}
              onClick={() => void verifyOtpAndLink()}
              className="min-h-12 w-full rounded-xl bg-[var(--bale-accent)] px-5 py-3 font-semibold text-[var(--bale-button-text)] transition-[filter] hover:brightness-95 active:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bale-accent)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              تأیید و اتصال حساب
            </button>
          </>
        )}
        {view === 'unsupported-account' && (
          <p
            role="alert"
            className="rounded-xl bg-[var(--bale-background)] px-4 py-3 text-sm leading-7 text-[var(--bale-text)]"
          >
            ورود از بله فقط برای حساب فعال مراجعان در دسترس است.
          </p>
        )}
        {view === 'error' && (
          <button
            type="button"
            className="min-h-12 w-full rounded-xl border border-[var(--bale-border)] bg-[var(--bale-background)] px-5 py-3 font-semibold text-[var(--bale-text)] transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bale-accent)]"
            onClick={() => void openBale()}
          >
            تلاش دوباره
          </button>
        )}
        {error && (
          <p
            role="alert"
            className="w-full rounded-xl bg-[color-mix(in_srgb,var(--bale-danger)_10%,var(--bale-surface))] px-4 py-3 text-sm leading-6 text-[var(--bale-danger)]"
          >
            {error}
          </p>
        )}
        {canExpand && (
          <button
            type="button"
            onClick={() => window.Bale?.WebApp?.expand?.()}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-[var(--bale-hint)] transition-[filter] hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bale-accent)]"
          >
            تمام‌صفحه
          </button>
        )}
      </section>
    </main>
  );
}

"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import type { Authentication } from "@/auth/session";
import { acceptBaleAuthentication } from "@/components/auth/session-gate";
import { apiBaseUrl } from "@/lib/api";

interface BaleWebApp {
  initData: string;
  isMiniAppSupported?: boolean;
  ready(): void;
  expand?(): void;
  requestContact?(callback: (accepted: boolean, phone?: string) => void): void;
}
declare global {
  interface Window { Bale?: { WebApp?: BaleWebApp } }
}

type BaleFlow =
  | { status: "AUTHENTICATED"; authentication: Authentication }
  | { status: "ACCOUNT_LINK_REQUIRED"; phone: string }
  | { status: "CONTACT_REQUIRED" | "CONTACT_PENDING" };
type BaleRequest = { status: "CONTACT_REQUIRED"; ticket: string; expiresAt: string };
type OtpChallenge = { challengeId: string; destinationMasked: string; expiresAt: string };
type View = "opening" | "contact" | "waiting" | "phone" | "code" | "error";

async function apiPost<T>(path: string, body: object, extraHeaders: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/v1/${path}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { code?: string } | null;
    throw new Error(error?.code || `HTTP_${response.status}`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Public mini-app entrypoint: it never navigates to apps/web. */
export default function BaleMiniAppPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("opening");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const initData = useRef("");
  const opening = useRef(false);

  const finish = useCallback((authentication: Authentication) => {
    acceptBaleAuthentication(authentication);
    router.replace("/");
  }, [router]);

  const openBale = useCallback(async () => {
    if (opening.current) return;
    opening.current = true;
    setView("opening");
    setError("");
    try {
      const webApp = window.Bale?.WebApp;
      if (!webApp?.initData) throw new Error("BALE_CONTEXT_MISSING");
      initData.current = webApp.initData;
      window.sessionStorage.setItem("mushroom:bale-miniapp", "1");
      webApp.ready();
      webApp.expand?.();
      const result = await apiPost<BaleFlow>("auth/bale/exchange", { initData: initData.current });
      if (result.status === "AUTHENTICATED") finish(result.authentication);
      else setView("contact");
    } catch {
      setError("ارتباط امن با بله برقرار نشد. مینی‌اپ را از داخل بله دوباره باز کنید.");
      setView("error");
    } finally {
      opening.current = false;
    }
  }, [finish]);

  const requestContact = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const webApp = window.Bale?.WebApp;
      if (!webApp?.requestContact) throw new Error("UNSUPPORTED");
      const response = await apiPost<BaleRequest>("auth/bale/contact/request", { initData: initData.current });
      setTicket(response.ticket);
      webApp.requestContact((accepted) => {
        setView(accepted ? "waiting" : "contact");
        if (!accepted) setError("برای ادامه، شماره تلفن خود را در بله تأیید کنید.");
      });
    } catch {
      setError("درخواست شماره انجام نشد. نسخه بله یا ارتباط شبکه را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (view !== "waiting" || !ticket) return;
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const result = await apiPost<BaleFlow>("auth/bale/contact/complete", { initData: initData.current, ticket });
        if (cancelled) return;
        if (result.status === "AUTHENTICATED") finish(result.authentication);
        else if (result.status === "ACCOUNT_LINK_REQUIRED") {
          setPhone(result.phone);
          setView("phone");
        }
      } catch {
        if (!cancelled) {
          setError("تأیید شماره کامل نشد یا زمان درخواست پایان یافت. دوباره تلاش کنید.");
          setView("error");
        }
      } finally { inFlight = false; }
    };
    void poll();
    const interval = window.setInterval(() => { void poll(); }, 1500);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [view, ticket, finish]);

  const requestOtp = async () => {
    if (busy || !phone.trim()) return;
    setBusy(true);
    setError("");
    try {
      const challenge = await apiPost<OtpChallenge>("auth/otp/challenges", { phone, remember: true }, { "idempotency-key": crypto.randomUUID() });
      setChallenge(challenge);
      setView("code");
    } catch {
      setError("ارسال کد به شماره‌ی تأییدشده ممکن نشد. کمی بعد دوباره تلاش کنید.");
    } finally { setBusy(false); }
  };

  const verifyOtpAndLink = async () => {
    if (busy || !challenge || !/^\d{4,8}$/u.test(code)) return;
    setBusy(true);
    setError("");
    try {
      const authentication = await apiPost<Authentication>(
        `auth/otp/challenges/${encodeURIComponent(challenge.challengeId)}/verify`, { code },
      );
      try {
        // The authenticated OTP session must match the phone verified by Bale's bot.
        await apiPost<void>(
          "auth/bale/contact/link",
          { initData: initData.current, ticket },
          { authorization: `Bearer ${authentication.accessToken}` },
        );
        finish(authentication);
      } catch {
        setError("تأیید انجام شد، اما اتصال حساب کامل نشد. دوباره از بله وارد شوید.");
      }
    } catch {
      setError("کد معتبر نبود یا زمان آن تمام شده است. کد تازه بگیرید و دوباره تلاش کنید.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-dvh bg-[#eef9fd] px-4 py-6 text-slate-900 sm:px-6 sm:py-10" dir="rtl">
      <Script src="https://tapi.bale.ai/miniapp.js?3" strategy="afterInteractive" onReady={() => { void openBale(); }}
        onError={() => { setError("دریافت ابزار ارتباطی بله ناموفق بود."); setView("error"); }} />
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col items-center justify-center gap-5 rounded-3xl border border-sky-100 bg-white px-5 py-8 text-center shadow-sm sm:min-h-[75dvh] sm:px-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[#e5f6fc] text-[#008fc8]">
          {view === "opening" || view === "waiting" ? <LoaderCircle className="size-8 animate-spin" />
            : view === "code" ? <ShieldCheck className="size-8" /> : <Smartphone className="size-8" />}
        </div>
        <h1 className="text-xl font-bold leading-8 text-slate-900 sm:text-2xl">ورود امن با بله</h1>
        {view === "opening" && <p className="text-sm leading-7 text-slate-600">در حال بررسی حساب شما…</p>}
        {view === "contact" && <>
          <p className="text-sm leading-7 text-slate-600">برای ورود امن، شماره‌تان را در بله تأیید کنید. شماره فقط برای شناسایی حساب استفاده می‌شود.</p>
          <button type="button" disabled={busy} onClick={() => void requestContact()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0097d7] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0086c1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007fb8] disabled:opacity-60">
            {busy ? "لطفاً صبر کنید…" : "تأیید شماره در بله"} <ArrowLeft size={18} />
          </button>
        </>}
        {view === "waiting" && <p className="text-sm leading-7 text-slate-600">در حال دریافت تأیید امن شماره هستیم. لطفاً این صفحه را باز نگه دارید.</p>}
        {view === "phone" && <>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><CheckCircle2 className="size-5 text-[#0097d7]" /> شماره‌ی شما تأیید شد.</div>
          <p className="text-sm leading-7 text-slate-600">برای اتصال حساب قبلی، کد ورود را به همین شماره می‌فرستیم.</p>
          <label className="w-full text-right text-sm font-medium text-slate-700">شماره تأییدشده
            <input className="mt-2 min-h-12 w-full rounded-xl border border-sky-100 bg-sky-50 px-4 text-left text-slate-700 outline-none" dir="ltr" type="tel"
              autoComplete="tel" value={phone} readOnly aria-readonly="true" />
          </label>
          <button className="min-h-12 w-full rounded-xl bg-[#0097d7] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0086c1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007fb8] disabled:opacity-60"
            type="button" disabled={busy || !phone.trim()} onClick={() => void requestOtp()}>ارسال کد تأیید</button>
        </>}
        {view === "code" && <>
          <p className="text-sm leading-7 text-slate-600">کد ارسال‌شده به {challenge?.destinationMasked} را وارد کنید.</p>
          <label className="w-full text-right text-sm">کد پیامکی
            <input className="mt-2 min-h-12 w-full rounded-xl border border-sky-100 bg-white px-4 text-center outline-none focus:border-[#0097d7] focus:ring-2 focus:ring-[#0097d7]/20" type="text" dir="ltr"
              inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} />
          </label>
          <button type="button" disabled={busy || !/^\d{4,8}$/u.test(code)} onClick={() => void verifyOtpAndLink()}
            className="min-h-12 w-full rounded-xl bg-[#0097d7] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0086c1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007fb8] disabled:opacity-60">
            تأیید و اتصال حساب
          </button>
        </>}
        {view === "error" && <button type="button" className="w-full rounded-2xl border px-5 py-3"
          onClick={() => void openBale()}>تلاش دوباره</button>}
        {error && <p role="alert" className="text-sm leading-6 text-rose-700">{error}</p>}
        <p className="text-xs leading-6 text-slate-500">حساب شما فقط پس از تأیید امن بله وارد می‌شود.</p>
      </section>
    </main>
  );
}

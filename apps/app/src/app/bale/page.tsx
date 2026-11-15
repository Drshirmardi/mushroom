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
  | { status: "CONTACT_REQUIRED" | "CONTACT_PENDING" | "ACCOUNT_LINK_REQUIRED" };
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
      webApp.requestContact((accepted, sharedPhone) => {
        if (typeof sharedPhone === "string") setPhone(sharedPhone);
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
        else if (result.status === "ACCOUNT_LINK_REQUIRED") setView("phone");
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
      setError("ارسال پیامک تأیید امکان‌پذیر نیست. شماره را بررسی کنید یا دوباره تلاش کنید.");
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
      // The authenticated OTP session must match the phone verified by Bale's bot.
      await apiPost<void>(
        "auth/bale/contact/link",
        { initData: initData.current, ticket },
        { authorization: `Bearer ${authentication.accessToken}` },
      );
      finish(authentication);
    } catch {
      setError("اتصال حساب انجام نشد. شماره تأییدشده در بله و شماره حساب باید یکسان باشند.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground" dir="rtl">
      <Script src="https://tapi.bale.ai/miniapp.js?3" strategy="afterInteractive" onReady={() => { void openBale(); }}
        onError={() => { setError("دریافت ابزار ارتباطی بله ناموفق بود."); setView("error"); }} />
      <section className="mx-auto flex min-h-[75dvh] w-full max-w-md flex-col items-center justify-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          {view === "opening" || view === "waiting" ? <LoaderCircle className="size-8 animate-spin" />
            : view === "code" ? <ShieldCheck className="size-8" /> : <Smartphone className="size-8" />}
        </div>
        <h1 className="text-2xl font-semibold">ورود امن به برنامه دکتر شیرمردی</h1>
        {view === "opening" && <p className="text-muted-foreground">در حال بررسی هویت شما از طریق بله…</p>}
        {view === "contact" && <>
          <p className="text-muted-foreground">برای اتصال حساب و حفظ اطلاعات تست‌ها، رزروها و خریدهای شما، شماره تلفنتان را یک‌بار با بله تأیید کنید.</p>
          <button type="button" disabled={busy} onClick={() => void requestContact()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-60">
            {busy ? "در حال آماده‌سازی…" : "تأیید شماره با بله"} <ArrowLeft size={18} />
          </button>
        </>}
        {view === "waiting" && <p className="text-muted-foreground">منتظر تأیید شماره از سرور بازوی بله هستیم. لطفاً این صفحه را باز نگه دارید.</p>}
        {view === "phone" && <>
          <div className="flex items-center gap-2 text-sm text-foreground"><CheckCircle2 className="size-5 text-green-600" /> شماره شما در بله تأیید شد.</div>
          <p className="text-muted-foreground">این شماره قبلاً در Mushroom ثبت شده است. برای اتصال امن حساب قبلی، یک بار با کد پیامکی وارد شوید؛ نیازی به رفتن به وب‌سایت نیست.</p>
          <label className="w-full text-right text-sm">شماره موبایل حساب
            <input className="mt-2 w-full rounded-xl border bg-background p-3 text-left" dir="ltr" type="tel"
              autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} />
          </label>
          <button className="w-full rounded-2xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-60"
            type="button" disabled={busy || !phone.trim()} onClick={() => void requestOtp()}>ارسال کد تأیید</button>
        </>}
        {view === "code" && <>
          <p className="text-muted-foreground">کد ارسال‌شده به {challenge?.destinationMasked} را وارد کنید.</p>
          <label className="w-full text-right text-sm">کد پیامکی
            <input className="mt-2 w-full rounded-xl border bg-background p-3 text-center" type="text" dir="ltr"
              inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} />
          </label>
          <button type="button" disabled={busy || !/^\d{4,8}$/u.test(code)} onClick={() => void verifyOtpAndLink()}
            className="w-full rounded-2xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-60">
            تأیید و اتصال حساب
          </button>
        </>}
        {view === "error" && <button type="button" className="w-full rounded-2xl border px-5 py-3"
          onClick={() => void openBale()}>تلاش دوباره</button>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">اطلاعات حساب فقط پس از اعتبارسنجی سمت سرور در دسترس قرار می‌گیرد.</p>
      </section>
    </main>
  );
}

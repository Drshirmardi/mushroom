"use client";

import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { requestOtp, resendOtp, verifyOtp, type OtpChallenge } from "@/services/auth";
import { normalizeDigits, normalizePhone } from "@/lib/validation";

export function OtpAuthForm({ onAuthenticated, requireTerms = false }: { onAuthenticated: (roles: string[]) => void; requireTerms?: boolean }) {
  const [phone, setPhone] = useState(""); const [remember, setRemember] = useState(true); const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now());
  const [terms, setTerms] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (challenge) codeRef.current?.focus(); }, [challenge]);
  const seconds = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - now) / 1000));
  const send = async () => { setBusy(true); setError(null); const result = await requestOtp({ phone: normalizePhone(phone), remember }); setBusy(false); if (result.ok) setChallenge(result.challenge); else setError(result.message); };
  const resend = async () => { if (!challenge) return; setBusy(true); setError(null); const result = await resendOtp(challenge.challengeId); setBusy(false); if (result.ok) { setChallenge(result.challenge); setCode(""); } else setError(result.message); };
  const verify = async () => { if (!challenge) return; setBusy(true); setError(null); const result = await verifyOtp(challenge.challengeId, code); setBusy(false); if (result.ok) onAuthenticated([...result.roles]); else setError(result.message); };
  return <div className="space-y-5">
    {error && <AuthErrorAlert message={error} />}
    {!challenge ? <>
      <label className="block text-sm font-medium">شماره موبایل<input dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" className="mt-2 h-12 w-full rounded-xl border border-input bg-transparent px-4 text-left outline-none focus:ring-2 focus:ring-primary/30" /></label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox checked={remember} onCheckedChange={(value) => setRemember(value === true)} />مرا به خاطر بسپار</label>
      {requireTerms && <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><Checkbox className="mt-1" checked={terms} onCheckedChange={(value) => setTerms(value === true)} />شرایط استفاده فعلی را خوانده‌ام و می‌پذیرم.</label>}
      <button type="button" disabled={busy || phone.trim().length < 10 || (requireTerms && !terms)} onClick={() => void send()} className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال ارسال…" : "ارسال کد"}</button>
    </> : <>
      <div className="rounded-xl bg-primary/5 p-3 text-sm leading-6"><b>کد ارسال شد</b><p className="text-muted-foreground">مقصد: <span dir="ltr">{challenge.destinationMasked}</span></p></div>
      <label className="block text-sm font-medium">کد یک‌بارمصرف<input ref={codeRef} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(normalizeDigits(event.target.value).replace(/\D/g, ""))} className="mt-2 h-14 w-full rounded-xl border border-input bg-transparent px-4 text-center text-2xl tracking-[0.45em] outline-none focus:ring-2 focus:ring-primary/30" /></label>
      <p aria-live="polite" className="text-xs text-muted-foreground">اعتبار کد: {seconds(challenge.expiresAt).toLocaleString("fa-IR")} ثانیه</p>
      <button type="button" disabled={busy || code.length < 4 || seconds(challenge.expiresAt) === 0} onClick={() => void verify()} className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال بررسی…" : "تأیید و ادامه"}</button>
      <div className="flex items-center justify-between gap-3 text-sm"><button type="button" onClick={() => { setChallenge(null); setCode(""); setError(null); }} className="text-primary">تغییر شماره</button><button type="button" disabled={busy || seconds(challenge.resendAvailableAt) > 0} onClick={() => void resend()} className="text-primary disabled:text-muted-foreground">{seconds(challenge.resendAvailableAt) > 0 ? `ارسال دوباره تا ${seconds(challenge.resendAvailableAt).toLocaleString("fa-IR")}` : "ارسال دوباره"}</button></div>
    </>}
  </div>;
}

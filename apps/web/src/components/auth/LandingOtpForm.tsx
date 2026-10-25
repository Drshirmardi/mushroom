"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { formatPhoneDigits, normalizeDigits, normalizePhone, phoneSchema } from "@/lib/validation";
import { requestOtp, resendOtp, verifyOtp, type OtpChallenge } from "@/services/auth";
import { AuthErrorAlert } from "./AuthErrorAlert";

const CODE_LENGTH = 6;

export function LandingOtpForm({ onAuthenticated }: {
    onAuthenticated: (roles: string[]) => void;
}) {
    const [phone, setPhone] = useState("");
    const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<"send" | "resend" | "verify" | null>(null);
    const [roles, setRoles] = useState<string[] | null>(null);
    const [now, setNow] = useState(Date.now());
    const input = useRef<HTMLInputElement>(null);
    const phoneInput = useRef<HTMLInputElement>(null);
    const continueButton = useRef<HTMLButtonElement>(null);
    const inFlight = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    useEffect(() => {
        if (!challenge || roles) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        input.current?.focus();
        return () => window.clearInterval(timer);
    }, [challenge, roles]);
    useEffect(() => { if (roles) continueButton.current?.focus(); }, [roles]);

    const seconds = (date: string) => Math.max(0, Math.ceil((Date.parse(date) - now) / 1000));
    const busy = action !== null;

    async function send(resending = false) {
        if (inFlight.current) return;
        const normalizedInput = normalizePhone(phone);
        const submittedPhone = /^9\d{9}$/.test(normalizedInput) ? `0${normalizedInput}` : normalizedInput;
        if (!resending && !phoneSchema.safeParse(submittedPhone).success) {
            setError("شماره همراه را با صفر وارد کنید؛ نمونه: ۰۹۱۲۳۴۵۶۷۸۹");
            phoneInput.current?.focus();
            return;
        }
        if (resending && (!challenge || seconds(challenge.resendAvailableAt) > 0)) return;
        inFlight.current = true;
        setAction(resending ? "resend" : "send");
        setError(null);
        const result = resending && challenge
            ? await resendOtp(challenge.challengeId)
            : await requestOtp({ phone: submittedPhone, remember: true });
        inFlight.current = false;
        if (!mounted.current) return;
        setAction(null);
        setNow(Date.now());
        if (result.ok) {
            setCode("");
            setChallenge(result.challenge);
        } else setError(result.message);
    }

    async function verify(value: string) {
        if (inFlight.current || !challenge || value.length !== CODE_LENGTH || roles) return;
        if (seconds(challenge.expiresAt) === 0) {
            setError("زمان اعتبار کد تمام شده است؛ کد تازه بگیرید.");
            return;
        }
        inFlight.current = true;
        setAction("verify");
        setError(null);
        // The reference's orbit accompanies the real request; it never decides success.
        const [result] = await Promise.all([
            verifyOtp(challenge.challengeId, value),
            new Promise(resolve => window.setTimeout(resolve,
                window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1350)),
        ]);
        inFlight.current = false;
        if (!mounted.current) return;
        setAction(null);
        if (result.ok) setRoles([...result.roles]);
        else {
            setError(result.message);
            setCode("");
            window.requestAnimationFrame(() => input.current?.focus());
        }
    }

    return <div className={`landing-otp ${action === "verify" ? "is-verifying" : ""} ${roles ? "is-success" : ""} ${error ? "has-error" : ""}`}>
        <div className="landing-auth-heading">
            <h2 id="landing-auth-title">{roles ? "خوش آمدید" : challenge ? "تأیید شماره موبایل" : "ورود"}</h2>
            <p>{roles ? "شماره موبایل شما با موفقیت تأیید شد." : challenge
                ? <>کد پیامک‌شده به <b dir="ltr">{challenge.destinationMasked}</b> را وارد کنید.</>
                : "لطفاً شماره همراه خود را وارد کنید."}</p>
        </div>

        {!challenge ? <form onSubmit={event => { event.preventDefault(); void send(); }} className="landing-phone-form">
            <fieldset className="landing-phone-field">
                <legend><label htmlFor="landing-phone">شماره همراه</label></legend>
                <div className="landing-phone-control" dir="ltr">
                    <input ref={phoneInput} id="landing-phone" aria-label="شماره همراه" autoFocus type="tel" inputMode="numeric" autoComplete="tel-national"
                    dir="ltr" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" pattern="[۰-۹]*" value={phone} disabled={busy}
                    aria-invalid={Boolean(error)} aria-describedby={error ? "landing-auth-error" : undefined}
                    onKeyDown={event => {
                        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1
                            && !/[0-9۰-۹٠-٩]/.test(event.key)) event.preventDefault();
                    }}
                    onChange={event => {
                        const field = event.currentTarget;
                        const value = formatPhoneDigits(field.value);
                        const caret = formatPhoneDigits(field.value.slice(0, field.selectionStart ?? field.value.length)).length;
                        setPhone(value);
                        if (error) setError(null);
                        window.requestAnimationFrame(() => {
                            if (document.activeElement === field) field.setSelectionRange(caret, caret);
                        });
                    }} />
                    <Smartphone className="landing-phone-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </div>
            </fieldset>
            {error && <div id="landing-auth-error"><AuthErrorAlert message={error} /></div>}
            <button className="landing-auth-primary" type="submit" disabled={busy || !phone.trim()}>
                {busy ? <><LoaderCircle className="animate-spin" size={18} /> در حال ارسال کد…</> : <>دریافت کد ورود <ArrowLeft size={18} /></>}
            </button>
            <p className="landing-auth-footnote"><ShieldCheck size={16} aria-hidden="true" /> ورود امن با کد یک‌بارمصرف</p>
        </form> : <>
            <div className="landing-otp-scene">
                <div className="landing-otp-orbit" aria-hidden="true" />
                <div className="landing-otp-rotor" aria-hidden="true">
                    {Array.from({ length: CODE_LENGTH }, (_, index) => <div key={index}
                        style={{ "--digit-index": index } as CSSProperties}
                        className={`landing-otp-digit ${code[index] ? "is-filled" : ""} ${index === Math.min(code.length, CODE_LENGTH - 1) ? "is-active" : ""}`}>
                        <span key={code[index] || "empty"}>{formatPhoneDigits(code[index] || "")}</span>
                    </div>)}
                </div>
                {!roles && <input ref={input} className="landing-otp-input" type="text" dir="ltr" inputMode="numeric"
                    autoComplete="one-time-code" aria-label="کد یک‌بارمصرف شش‌رقمی" aria-invalid={Boolean(error)}
                    aria-describedby={error ? "landing-auth-error" : "landing-otp-help"} value={code} disabled={busy}
                    onChange={event => {
                        const value = normalizeDigits(event.target.value).replace(/\D/g, "").slice(0, CODE_LENGTH);
                        setCode(value); setError(null);
                        if (value.length === CODE_LENGTH) void verify(value);
                    }}
                    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void verify(code); } }} />}
                <div className="landing-otp-success" aria-hidden="true">
                    <div className="landing-success-ring" /><div className="landing-success-ring inner" />
                    <span className="landing-success-check"><Check size={38} strokeWidth={2.5} /></span>
                    {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--particle-index": index } as CSSProperties} />)}
                </div>
            </div>
            <div className="landing-otp-feedback" role="status" aria-live="polite">
                {roles ? <span className="landing-auth-secure"><ShieldCheck size={18} /> با خیال آسوده ادامه دهید</span>
                    : action === "verify" ? "در حال تأیید کد…" : <span id="landing-otp-help">کد شش‌رقمی را وارد کنید؛ تأیید به‌صورت خودکار انجام می‌شود.</span>}
            </div>
            {error && <div id="landing-auth-error"><AuthErrorAlert message={error} /></div>}
            {roles ? <button ref={continueButton} type="button" className="landing-auth-primary" onClick={() => onAuthenticated(roles)}>
                ادامه مسیر <ArrowLeft size={18} />
            </button> : <div className="landing-otp-actions">
                <span className="landing-otp-expiry">اعتبار کد: {seconds(challenge.expiresAt).toLocaleString("fa-IR")} ثانیه</span>
                <button type="button" disabled={busy || seconds(challenge.resendAvailableAt) > 0} onClick={() => void send(true)}>
                    {action === "resend" ? "در حال ارسال…" : seconds(challenge.resendAvailableAt) > 0
                        ? `ارسال دوباره تا ${seconds(challenge.resendAvailableAt).toLocaleString("fa-IR")} ثانیه` : "ارسال دوباره کد"}
                </button>
                <button type="button" disabled={busy} onClick={() => { setChallenge(null); setCode(""); setError(null); window.requestAnimationFrame(() => phoneInput.current?.focus()); }}>
                    ویرایش شماره موبایل
                </button>
            </div>}
        </>}
    </div>;
}

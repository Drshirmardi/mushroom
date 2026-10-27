"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { formatPhoneDigits, normalizeDigits, normalizePhone, phoneSchema } from "@/lib/validation";
import { requestOtp, resendOtp, verifyOtp, type OtpChallenge } from "@/services/auth";
import { AuthErrorAlert } from "./AuthErrorAlert";

const CODE_LENGTH = 6;

export function LandingOtpForm({ active, onAuthenticated }: {
    active: boolean;
    onAuthenticated: (roles: string[]) => void;
}) {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");
    const locale = useLocale();
    const digits = (value: string) => locale === "fa" ? formatPhoneDigits(value) : normalizeDigits(value).replace(/\D/g, "");
    const [phone, setPhone] = useState("");
    const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<"send" | "resend" | "verify" | null>(null);
    const [roles, setRoles] = useState<string[] | null>(null);
    const [now, setNow] = useState(Date.now());
    const input = useRef<HTMLInputElement>(null);
    const phoneInput = useRef<HTMLInputElement>(null);
    const inFlight = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    useEffect(() => {
        if (!challenge || roles) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [challenge, roles]);
    useEffect(() => {
        if (!active) return;
        if (challenge && !roles) input.current?.focus();
    }, [active, challenge, roles]);
    useEffect(() => {
        if (!roles) return;
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
        const timer = window.setTimeout(() => onAuthenticated(roles), delay);
        return () => window.clearTimeout(timer);
    }, [roles, onAuthenticated]);

    const seconds = (date: string) => Math.max(0, Math.ceil((Date.parse(date) - Math.max(now, Date.now())) / 1000));
    const busy = action !== null;
    const codeRemaining = challenge ? seconds(challenge.expiresAt) : 0;
    const resendRemaining = challenge ? Math.max(codeRemaining, seconds(challenge.resendAvailableAt)) : 0;

    async function send(resending = false) {
        if (inFlight.current) return;
        const normalizedInput = normalizePhone(phone);
        const submittedPhone = /^9\d{9}$/.test(normalizedInput) ? `0${normalizedInput}` : normalizedInput;
        if (!resending && !phoneSchema.safeParse(submittedPhone).success) {
            setError("INVALID_PHONE_NUMBER");
            phoneInput.current?.focus();
            return;
        }
        if (resending && (!challenge || Math.max(Date.parse(challenge.expiresAt), Date.parse(challenge.resendAvailableAt)) > Date.now())) return;
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
        } else setError(result.code ?? "GENERIC");
    }

    async function verify(value: string) {
        if (inFlight.current || !challenge || value.length !== CODE_LENGTH || roles) return;
        if (seconds(challenge.expiresAt) === 0) {
            setError("OTP_EXPIRED");
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
            setError(result.code ?? "GENERIC");
            setCode("");
            window.requestAnimationFrame(() => input.current?.focus());
        }
    }

    const errorKey = error && t.has(`errors.${error}`) ? error : error && /DISABLED|UNAVAILABLE|NOT_ALLOWED/.test(error) ? "UNAVAILABLE" : "GENERIC";
    const errorMessage = error ? t(`errors.${errorKey}`) : "";
    return <div className={`landing-otp ${action === "verify" ? "is-verifying" : ""} ${roles ? "is-success" : ""} ${error ? "has-error" : ""}`}>
        <div className="landing-auth-heading">
            <h2 id="landing-auth-title">{roles ? t("successTitle") : challenge ? t("verifyTitle") : t("title")}</h2>
            <p>{roles ? t("successText") : challenge
                ? <>{t("codePrompt")} <b dir="ltr">{challenge.destinationMasked}</b> {t("codePromptEnd")}</>
                : t("phonePrompt")}</p>
        </div>

        {!challenge ? <form onSubmit={event => { event.preventDefault(); void send(); }} className="landing-phone-form">
            <fieldset className="landing-phone-field">
                <legend><label htmlFor="landing-phone">{t("phoneLabel")}</label></legend>
                <div className="landing-phone-control" dir="ltr">
                    <input ref={phoneInput} id="landing-phone" aria-label={t("phoneLabel")} autoFocus type="tel" inputMode="numeric" autoComplete="tel-national"
                    dir="ltr" placeholder={t("phonePlaceholder")} pattern="[0-9۰-۹٠-٩]*" value={digits(phone)} disabled={busy}
                    aria-invalid={Boolean(error)} aria-describedby={error ? "landing-auth-error" : undefined}
                    onKeyDown={event => {
                        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1
                            && !/[0-9۰-۹٠-٩]/.test(event.key)) event.preventDefault();
                    }}
                    onChange={event => {
                        const field = event.currentTarget;
                        const value = normalizeDigits(field.value).replace(/\D/g, "").slice(0, 11);
                        const caret = normalizeDigits(field.value.slice(0, field.selectionStart ?? field.value.length)).replace(/\D/g, "").length;
                        setPhone(value);
                        if (error) setError(null);
                        window.requestAnimationFrame(() => {
                            if (document.activeElement === field) field.setSelectionRange(caret, caret);
                        });
                    }} />
                    <Smartphone className="landing-phone-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </div>
            </fieldset>
            {error && <div id="landing-auth-error"><AuthErrorAlert message={errorMessage} /></div>}
            <button className="landing-auth-primary" type="submit" disabled={busy || !phone.trim()}>
                {busy ? <><LoaderCircle className="animate-spin" size={18} /> {t("sending")}</> : <>{t("send")} <ArrowLeft className={locale === "fa" ? "" : "rotate-180"} size={18} /></>}
            </button>
            <p className="landing-auth-footnote"><ShieldCheck size={16} aria-hidden="true" /> {t("secure")}</p>
            {locale !== "fa" && <p className="app-language-note">{common("appNotice")}</p>}
        </form> : <>
            <div className="landing-otp-scene">
                <div className="landing-otp-orbit" aria-hidden="true" />
                <div className="landing-otp-rotor" aria-hidden="true">
                    {Array.from({ length: CODE_LENGTH }, (_, index) => <div key={index}
                        style={{ "--digit-index": index } as CSSProperties}
                        className={`landing-otp-digit ${code[index] ? "is-filled" : ""} ${index === Math.min(code.length, CODE_LENGTH - 1) ? "is-active" : ""}`}>
                        <span key={code[index] || "empty"}>{digits(code[index] || "")}</span>
                    </div>)}
                </div>
                {!roles && <input ref={input} className="landing-otp-input" type="text" dir="ltr" inputMode="numeric"
                    autoComplete="one-time-code" aria-label={t("codeLabel")} aria-invalid={Boolean(error)}
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
                {roles ? <span className="landing-auth-secure"><ShieldCheck size={18} /> {t("redirecting")}</span>
                    : action === "verify" ? t("verifying") : <span id="landing-otp-help">{t("codeHelp")}</span>}
            </div>
            {error && <div id="landing-auth-error"><AuthErrorAlert message={errorMessage} /></div>}
            {!roles && <div className="landing-otp-actions">
                <button className="landing-otp-expiry" type="button" disabled={busy || resendRemaining > 0} onClick={() => void send(true)}>
                    {action === "resend" ? t("resending") : codeRemaining > 0
                        ? t("validity", { seconds: codeRemaining.toLocaleString(locale) }) : resendRemaining > 0
                            ? t("cooldown", { seconds: resendRemaining.toLocaleString(locale) }) : t("resend")}
                </button>
                <button type="button" disabled={busy} onClick={() => { setChallenge(null); setCode(""); setError(null); window.requestAnimationFrame(() => phoneInput.current?.focus()); }}>
                    {t("edit")}
                </button>
            </div>}
        </>}
    </div>;
}

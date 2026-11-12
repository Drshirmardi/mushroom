"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { formatPhoneDigits, normalizeDigits, normalizePhone, phoneSchema } from "@/lib/validation";
import { loginWithPhone } from "@/services/auth";
import { AuthErrorAlert } from "./AuthErrorAlert";

export function LandingPasswordForm({ active, onAuthenticated, onUseOtp }: {
    active: boolean;
    onAuthenticated: (roles: string[]) => void;
    onUseOtp: () => void;
}) {
    const t = useTranslations("Auth");
    const common = useTranslations("Common");
    const locale = useLocale();
    const digits = (value: string) => locale === "fa" ? formatPhoneDigits(value) : normalizeDigits(value).replace(/\D/g, "");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [roles, setRoles] = useState<string[] | null>(null);
    const phoneInput = useRef<HTMLInputElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);
    const inFlight = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    useEffect(() => {
        if (active && !roles) phoneInput.current?.focus();
    }, [active, roles]);
    useEffect(() => {
        if (!roles) return;
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
        const timer = window.setTimeout(() => onAuthenticated(roles), delay);
        return () => window.clearTimeout(timer);
    }, [roles, onAuthenticated]);

    async function submit() {
        if (inFlight.current || roles) return;
        const normalizedInput = normalizePhone(phone);
        const submittedPhone = /^9\d{9}$/.test(normalizedInput) ? `0${normalizedInput}` : normalizedInput;
        if (!phoneSchema.safeParse(submittedPhone).success) {
            setError("INVALID_PHONE_NUMBER");
            phoneInput.current?.focus();
            return;
        }
        if (!password) {
            setError("PASSWORD_REQUIRED");
            passwordInput.current?.focus();
            return;
        }
        inFlight.current = true;
        setBusy(true);
        setError(null);
        const result = await loginWithPhone({ phone: submittedPhone, password, remember: true });
        inFlight.current = false;
        if (!mounted.current) return;
        setBusy(false);
        if (result.ok) setRoles([...result.roles]);
        else {
            setError(result.code ?? "GENERIC");
            window.requestAnimationFrame(() => passwordInput.current?.focus());
        }
    }

    const errorKey = error && t.has(`errors.${error}`) ? error : error && /DISABLED|UNAVAILABLE|NOT_ALLOWED/.test(error) ? "UNAVAILABLE" : "GENERIC";
    const errorMessage = error ? t(`errors.${errorKey}`) : "";
    return <div className={`landing-password ${roles ? "is-success" : ""} ${error ? "has-error" : ""}`}>
        <div className="landing-auth-heading">
            <h2 id="landing-auth-title">{roles ? t("successTitle") : t("passwordTitle")}</h2>
            <p>{roles ? t("successText") : t("passwordPrompt")}</p>
        </div>
        {roles ? <div className="landing-otp-feedback" role="status" aria-live="polite">
            <span className="landing-auth-secure"><ShieldCheck size={18} /> {t("redirecting")}</span>
        </div> : <form onSubmit={event => { event.preventDefault(); void submit(); }} className="landing-phone-form">
            <fieldset className="landing-phone-field">
                <legend><label htmlFor="landing-password-phone">{t("phoneLabel")}</label></legend>
                <div className="landing-phone-control" dir="ltr">
                    <input ref={phoneInput} id="landing-password-phone" aria-label={t("phoneLabel")} type="tel" inputMode="numeric" autoComplete="tel-national"
                        dir="ltr" placeholder={t("phonePlaceholder")} pattern="[0-9۰-۹٠-٩]*" value={digits(phone)} disabled={busy}
                        aria-invalid={error === "INVALID_PHONE_NUMBER"} aria-describedby={error ? "landing-auth-error" : undefined}
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
            <fieldset className="landing-phone-field">
                <legend><label htmlFor="landing-password">{t("passwordLabel")}</label></legend>
                <div className="landing-phone-control" dir="ltr">
                    <input ref={passwordInput} id="landing-password" aria-label={t("passwordLabel")} type={visible ? "text" : "password"}
                        autoComplete="current-password" dir="ltr" placeholder="••••••••" value={password} disabled={busy}
                        aria-invalid={error === "PASSWORD_REQUIRED" || error === "INVALID_CREDENTIALS"}
                        aria-describedby={error ? "landing-auth-error" : undefined}
                        onChange={event => { setPassword(event.target.value); if (error) setError(null); }} />
                    <button className="landing-password-toggle" type="button" aria-pressed={visible}
                        aria-label={visible ? t("hidePassword") : t("showPassword")}
                        onClick={() => setVisible(value => !value)}>
                        {visible ? <EyeOff size={20} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.75} aria-hidden="true" />}
                    </button>
                </div>
            </fieldset>
            {error && <div id="landing-auth-error"><AuthErrorAlert message={errorMessage} /></div>}
            <button className="landing-auth-primary" type="submit" disabled={busy}>
                {busy ? <><LoaderCircle className="animate-spin" size={18} /> {t("signingIn")}</> : <>{t("passwordSubmit")} <ArrowLeft className={isRtlLocale(locale) ? "" : "rotate-180"} size={18} /></>}
            </button>
            <button className="landing-auth-switch" type="button" disabled={busy} onClick={onUseOtp}>{t("otpLogin")}</button>
            {locale !== "fa" && <p className="app-language-note">{common("appNotice")}</p>}
        </form>}
    </div>;
}

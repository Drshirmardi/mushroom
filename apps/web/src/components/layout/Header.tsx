"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ArrowUpLeft, Menu, ScanFace } from "lucide-react";
import { WebSessionManager, dashboardUrlFor } from "@/auth/web-session";
import { apiClient, resolvePostLoginUrl } from "@/lib/api";
import { LocaleSwitcher } from "@/components/landing/LocaleSwitcher";

const sessionManager = new WebSessionManager(apiClient);
const LandingLoginDialog = dynamic(() => import("@/components/auth/LandingLoginDialog").then(module => module.LandingLoginDialog), { ssr: false });
const sections = ["home", "pathways", "doctor", "faq"];

export function Header() {
    const t = useTranslations("Common");
    const locale = useLocale();
    const labels = t.raw("nav") as string[];
    const [loginState, setLoginState] = useState<"idle" | "open" | "closed">("idle");
    const session = useSyncExternalStore(sessionManager.subscribe, sessionManager.getSnapshot, sessionManager.getSnapshot);
    const openLogin = useCallback((next?: string) => {
        if (next && sessionManager.getSnapshot().status === "authenticated") {
            window.location.assign(resolvePostLoginUrl(next));
            return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set("login", "1");
        if (next) url.searchParams.set("next", resolvePostLoginUrl(next));
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        setLoginState("open");
    }, []);
    const closeLogin = useCallback(() => {
        setLoginState("closed");
        const url = new URL(window.location.href);
        url.searchParams.delete("login");
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        void sessionManager.bootstrap();
    }, []);
    useEffect(() => {
        void sessionManager.bootstrap();
        if (new URLSearchParams(window.location.search).get("login") === "1") setLoginState("open");
        const request = (event: Event) => openLogin((event as CustomEvent<{ next?: string }>).detail?.next);
        window.addEventListener("landing-auth-request", request);
        return () => window.removeEventListener("landing-auth-request", request);
    }, [openLogin]);
    return <>
        <a className="site-skip" href="#main-content">{t("skip")}</a>
        <header className="site-header">
            <Link href={locale === "fa" ? "/" : `/${locale}`} className="site-brand" aria-label={t("brand")}>
                <span className="site-brand-mark"><ScanFace size={26} strokeWidth={1.4} aria-hidden="true" /></span>
                <span><strong>{t("brand")}</strong><small>{t("brandSub")}</small></span>
            </Link>
            <nav className="site-nav" aria-label={t("menu")}>{sections.map((id, i) => <a href={`#${id}`} key={id}>{labels[i]}</a>)}</nav>
            <div className="site-header-actions">
                <LocaleSwitcher />
                {session.status === "authenticated" ? <a className="site-login" href={dashboardUrlFor(session.authentication)}>{t("dashboard")}<ArrowUpLeft size={16} aria-hidden="true" /></a>
                    : <button type="button" className="site-login" aria-haspopup="dialog" onClick={() => openLogin()}>{t("login")}<ArrowUpLeft size={16} aria-hidden="true" /></button>}
                <details className="site-mobile-menu"><summary aria-label={t("menu")}><Menu size={21} aria-hidden="true" /></summary><nav aria-label={t("menu")}>{sections.map((id, i) => <a href={`#${id}`} key={id} onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>{labels[i]}</a>)}</nav></details>
            </div>
        </header>
        {loginState !== "idle" && <LandingLoginDialog open={loginState === "open"} onClose={closeLogin} />}
    </>;
}

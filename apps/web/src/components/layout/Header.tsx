"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { WebSessionManager, dashboardUrlFor } from "@/auth/web-session";
import { nav } from "@/data";
import { Icon } from "@/components/shared/Icon";
import { apiClient } from "@/lib/api";

const sessionManager = new WebSessionManager(apiClient);
const LandingLoginDialog = dynamic(() => import("@/components/auth/LandingLoginDialog").then(module => module.LandingLoginDialog), { ssr: false });

export function Header() {
    const [loginState, setLoginState] = useState<"idle" | "open" | "closed">("idle");
    const closeLogin = useCallback(() => {
        setLoginState("closed");
        const url = new URL(window.location.href);
        if (url.searchParams.has("login")) {
            url.searchParams.delete("login");
            window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        }
        void sessionManager.bootstrap();
    }, []);
    const session = useSyncExternalStore(
        sessionManager.subscribe,
        sessionManager.getSnapshot,
        sessionManager.getSnapshot,
    );

    useEffect(() => {
        void sessionManager.bootstrap();
        if (new URLSearchParams(window.location.search).get("login") === "1") setLoginState("open");
    }, []);

    return (
        <><header className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-border/60">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center text-primary-foreground">
                        <Icon name="spa" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">دکتر شیرمردی</span>
                </Link>
                <nav className="hidden lg:flex items-center gap-8 text-sm">
                    {nav.map((n) => (
                        <a
                            key={n.href}
                            href={n.href}
                            className="text-muted-foreground hover:text-primary transition-colors"
                        >
                            {n.label}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                        <Icon name="search" />
                    </button>
                    {session.status === "authenticated" ? (
                        <a
                            href={dashboardUrlFor(session.authentication)}
                            className="press inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 md:px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5 shadow-soft"
                        >
                            <Icon name="dashboard" />
                            داشبورد
                        </a>
                    ) : session.status === "anonymous" ? (
                        <>
                            <button
                                type="button"
                                aria-haspopup="dialog"
                                onClick={() => setLoginState("open")}
                                className="press inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 md:px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5 shadow-soft"
                            >
                                ورود
                            </button>
                        </>
                    ) : session.status === "unavailable" ? (
                        <button type="button" aria-haspopup="dialog" onClick={() => setLoginState("open")}
                            className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">ورود</button>
                    ) : (
                        <div aria-label="در حال بررسی حساب کاربری" className="h-10 w-24 animate-pulse rounded-full bg-secondary" />
                    )}
                </div>
            </div>
        </header>{loginState !== "idle" && <LandingLoginDialog open={loginState === "open"} onClose={closeLogin} />}</>
    );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import fa from "@/messages/fa.json";
import en from "@/messages/en.json";
import zh from "@/messages/zh-CN.json";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import type { Locale } from "@/i18n/routing";

const messages = { fa, en, "zh-CN": zh };

// The shell is above the locale route: changing language never unmounts an OTP attempt.
export function WebExperience({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
    const pathname = usePathname();
    const locale: Locale = /^\/en(?:\/|$)/.test(pathname) ? "en" : /^\/zh-CN(?:\/|$)/.test(pathname) ? "zh-CN" : /^\/(?:login|signup)(?:\/|$)/.test(pathname) ? initialLocale : "fa";
    const direction = locale === "fa" ? "rtl" : "ltr";
    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = direction;
    }, [locale, direction]);
    return <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Tehran">
        <Header />{children}<Footer /><Toaster dir={direction} position="top-center" richColors closeButton />
    </NextIntlClientProvider>;
}

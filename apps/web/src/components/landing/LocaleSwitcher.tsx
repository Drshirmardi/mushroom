"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe2, ChevronDown } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
    const locale = useLocale();
    const t = useTranslations("Common");
    const router = useRouter();
    function changeLanguage(value: string) {
        if (!isLocale(value)) return;
        const target = new URL(window.location.href);
        const current = target.pathname.replace(/^\/(en|zh-CN|fa)(?=\/|$)/, "") || "/";
        target.pathname = value === "fa" ? current : `/${value}${current === "/" ? "" : current}`;
        document.cookie = `NEXT_LOCALE=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.push(`${target.pathname}${target.search}${target.hash}`, { scroll: false });
    }
    return <label className="site-language">
        <Globe2 size={17} aria-hidden="true" />
        <span className="sr-only">{t("language")}</span>
        <select aria-label={t("language")} value={locale as Locale} onChange={event => changeLanguage(event.target.value)}>
            <option value="fa" lang="fa">فارسی</option><option value="en" lang="en">English</option><option value="zh-CN" lang="zh-CN">简体中文</option>
        </select><ChevronDown size={12} aria-hidden="true" />
    </label>;
}

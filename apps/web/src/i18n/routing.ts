import { defineRouting } from "next-intl/routing";

export const locales = ["fa", "en", "zh-CN", "ar"] as const;
export type Locale = (typeof locales)[number];
export const routing = defineRouting({
    locales,
    defaultLocale: "fa",
    localePrefix: "as-needed",
    localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
export function isLocale(value: string): value is Locale {
    return locales.includes(value as Locale);
}
export function isRtlLocale(locale: string): boolean {
    return locale === "fa" || locale === "ar";
}

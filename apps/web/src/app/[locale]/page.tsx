import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { Landing } from "@/components/landing/Landing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    const t = await getTranslations({ locale, namespace: "Meta" });
    const canonical = locale === "fa" ? "/" : `/${locale}`;
    return {
        title: t("title"), description: t("description"),
        alternates: { canonical, languages: { fa: "/", en: "/en", "zh-CN": "/zh-CN", "x-default": "/" } },
        openGraph: { title: t("title"), description: t("description"), type: "website", locale: locale.replace("-", "_") },
    };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    return <Landing />;
}

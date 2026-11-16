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
        alternates: { canonical, languages: { fa: "/", en: "/en", "zh-CN": "/zh-CN", ar: "/ar", "x-default": "/" } },
        openGraph: {
            title: t("title"), description: t("description"), type: "website",
            url: new URL(canonical, process.env.PUBLIC_WEB_URL || "http://localhost:3000").toString(),
            locale: locale.replace("-", "_"),
            images: [{ url: "/images/doctor-opengraph.jpg", width: 1200, height: 630, alt: t("imageAlt") }],
        },
        twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: ["/images/doctor-opengraph.jpg"] },
    };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    return <Landing />;
}

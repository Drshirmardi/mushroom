import type { Metadata } from "next";
import { AnalyticsTracking } from '@/components/analytics-tracking';
import { getLocale } from "next-intl/server";
import { WebExperience } from "@/components/landing/WebExperience";
import { isLocale, isRtlLocale } from "@/i18n/routing";
import "./globals.css";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.PUBLIC_WEB_URL || "http://localhost:3000"),
    title: "دکتر شیرمردی | شناخت مزاج و سبک زندگی",
    description:
        "شناخت مزاج، تغذیه، اصلاح سبک زندگی و خدمات مجموعه دکتر سید ابوالفتح شیرمردی.",
    openGraph: {
        title: "دکتر شیرمردی | از شناخت تا مراقبت",
        description: "شناخت مزاج، تغذیه و اصلاح سبک زندگی با همراهی مجموعه دکتر شیرمردی.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const requested = await getLocale();
    const locale = isLocale(requested) ? requested : "fa";
    const font = isRtlLocale(locale) ? "IRANYekanX-Regular.woff" : locale === "en" ? "Geist-Variable.woff2" : "NotoSansSC-Variable.woff2";
    return (
        <html lang={locale} dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
            <head>
                <link rel="preload" href={`/fonts/${font}`} as="font" type={isRtlLocale(locale) ? "font/woff" : "font/woff2"} crossOrigin="anonymous" />
                <script src="/runtime-config.js" />
            </head>
            <body>
                <AnalyticsTracking />
                <WebExperience initialLocale={locale}>{children}</WebExperience>
            </body>
        </html>
    );
}

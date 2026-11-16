"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function NotFound() {
    const t = useTranslations("Common");
    const locale = useLocale();
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="max-w-md text-center">
                <h1 className="text-7xl font-bold text-foreground">404</h1>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                    {t("notFoundTitle")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t("notFoundText")}
                </p>
                <div className="mt-6">
                    <Link
                        href={locale === "fa" ? "/" : `/${locale}`}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {t("backHome")}
                    </Link>
                </div>
            </div>
        </div>
    );
}

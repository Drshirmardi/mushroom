"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { EnamadSeal } from "@/components/landing/EnamadSeal";

export function Footer() {
    const t = useTranslations("Common");
    const locale = useLocale();
    const labels = t.raw("nav") as string[];
    return <footer className="site-footer">
        <div className="site-container footer-grid">
            <div className="footer-intro"><a className="site-brand" href={locale === "fa" ? "/" : `/${locale}`}><span className="site-brand-mark"><img src="/brand/shirmardi-logo.svg" width="64" height="32" alt="" aria-hidden="true" /></span><span><strong>{t("brand")}</strong><small>{t("brandSub")}</small></span></a><p>{t("footer")}</p></div>
            <nav aria-label={t("links")}><h2>{t("links")}</h2>{["home", "pathways", "doctor", "faq"].map((id, i) => <a href={`#${id}`} key={id}>{labels[i]}<ArrowUpRight size={13} aria-hidden="true" /></a>)}</nav>
            <div className="footer-contact"><h2>{t("contact")}</h2><a href="tel:+989129375298"><Phone size={16} aria-hidden="true" /><span dir="ltr">+98 912 937 5298</span></a><a href="mailto:info@drshirmardi.ir"><Mail size={16} aria-hidden="true" /><span>info@drshirmardi.ir</span></a><a href="https://www.google.com/maps?q=32.319636,50.859522" target="_blank" rel="noopener noreferrer"><MapPin size={18} aria-hidden="true" /><span>{t("address")}</span></a></div>
            <EnamadSeal />
        </div><div className="site-container footer-bottom"><span>© {new Date().getFullYear()} {t("copyright")}</span><div><a href="https://instagram.com/dr_shirmardi" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://t.me/dr_shirmardi" target="_blank" rel="noopener noreferrer">Telegram</a></div></div>
    </footer>;
}

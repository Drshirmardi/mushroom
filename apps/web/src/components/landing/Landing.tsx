"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleDot, HeartHandshake, Layers3, Leaf, ScanFace, ShieldCheck, ShoppingBag, Sparkles, Stethoscope, Utensils, Weight } from "lucide-react";
import { appUrl } from "@/lib/api";
import { isRtlLocale } from "@/i18n/routing";
import { WordLoopQuote } from "./WordLoopQuote";

type Path = { label: string; title: string; text: string; cta: string };
type Service = { title: string; subtitle: string; text: string; tags: string[] };
const destinations = ["/assessment", "/assessment/couples", "/appointments/book"];
const serviceIcons = [ScanFace, Utensils, Weight, Sparkles, HeartHandshake, Stethoscope];
const patientUrl = (path: string) => new URL(path.replace(/^\/+/, ""), `${appUrl.replace(/\/+$/, "")}/`).toString();

function begin(path: string) {
    window.dispatchEvent(new CustomEvent("landing-auth-request", { detail: { next: patientUrl(path) } }));
}

function ChoiceTabs({ labels, selected, onSelect, id, label, className = "" }: { labels: string[]; selected: number; onSelect: (index: number) => void; id: string; label: string; className?: string }) {
    const rtl = isRtlLocale(useLocale());
    function navigate(event: KeyboardEvent<HTMLDivElement>) {
        let next = selected;
        if (event.key === "Home") next = 0;
        else if (event.key === "End") next = labels.length - 1;
        else if (["ArrowRight", "ArrowDown"].includes(event.key)) next += event.key === "ArrowRight" && rtl ? -1 : 1;
        else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next += event.key === "ArrowLeft" && rtl ? 1 : -1;
        else return;
        event.preventDefault();
        next = (next + labels.length) % labels.length;
        onSelect(next);
        event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
    }
    return <div className={className} role="tablist" aria-label={label} onKeyDown={navigate}>{labels.map((title, index) => <button key={title} id={`${id}-tab-${index}`} role="tab" type="button" aria-selected={index === selected} aria-controls={`${id}-panel-${selected}`} tabIndex={selected === index ? 0 : -1} onClick={() => onSelect(index)}>{title}{id === "service" && <ArrowUpRight size={16} aria-hidden="true" />}</button>)}</div>;
}

export function Landing() {
    const t = useTranslations("Landing");
    const common = useTranslations("Common");
    const locale = useLocale();
    // Add further translated quotations here to rotate through multiple phrases.
    const quoteTexts = useMemo(() => [t("quote")], [t]);
    const Arrow = isRtlLocale(locale) ? ArrowLeft : ArrowRight;
    const [path, setPath] = useState(0);
    const [service, setService] = useState(0);
    const paths = t.raw("paths") as Path[];
    const services = t.raw("services") as Service[];
    const steps = t.raw("steps") as { title: string; text: string }[];
    const faqs = t.raw("faqs") as { q: string; a: string }[];
    const ServiceIcon = serviceIcons[service];
    const selectedService = services[service];
    const enter = (destination = "/assessment") => begin(destination);
    const action = (label: string, destination = "/assessment", secondary = false) => <button className={`landing-button ${secondary ? "landing-button-secondary" : ""}`} type="button" onClick={() => enter(destination)}>{label}<Arrow size={18} aria-hidden="true" /></button>;
    const note = locale !== "fa" && <small className="app-language-note">{common("appNotice")}</small>;

    return <main id="main-content" className="landing-main">
        <section id="home" className="site-container landing-hero">
            <div className="hero-copy"><p className="section-kicker"><span className="kicker-dot" />{t("eyebrow")}</p><h1>{t("title")}<br /><span>{t("titleEnd")}</span></h1><p className="hero-intro">{t("intro")}</p>
                <div className="hero-path-card"><div className="path-card-heading"><span>{t("pathLabel")}</span><CircleDot size={17} aria-hidden="true" /></div><ChoiceTabs id="hero" label={t("pathHint")} labels={paths.map(item => item.label)} selected={path} onSelect={setPath} className="hero-path-tabs" />
                    <div className="hero-path-panel" id={`hero-panel-${path}`} role="tabpanel" aria-labelledby={`hero-tab-${path}`}><h2>{paths[path].title}</h2><p>{paths[path].text}</p><div className="path-cta">{action(paths[path].cta, destinations[path])}{path === 0 && <span className="path-free-note"><ShieldCheck size={15} aria-hidden="true" />{t("pathNote")}</span>}</div>{note}</div>
                </div>
            </div>
            <figure className="hero-visual"><div className="hero-visual-halo" aria-hidden="true" /><div className="hero-photo"><img src="/images/doctor-portrait-refined.png" alt={t("portraitAlt")} width="1448" height="1086" fetchPriority="high" loading="eager" decoding="async" /></div><div className="hero-experience"><span className="experience-symbol"><Layers3 size={21} strokeWidth={1.5} aria-hidden="true" /></span><div><strong>{t("experience")}</strong><span>{t("experienceSub")}</span></div></div><div className="hero-quote"><span className="hero-quote-mark" aria-hidden="true">“</span><div><span>{t("quoteBy")}</span><WordLoopQuote key={locale} quotes={quoteTexts} locale={locale} /></div></div><figcaption><strong>{t("portraitCaption")}</strong><span>{t("portraitSub")}</span></figcaption></figure>
            <a className="hero-scroll" href="#journey">{t("explore")}<ArrowDown size={16} aria-hidden="true" /></a>
        </section>

        <section id="doctor" className="site-container doctor-overview"><div className="doctor-label"><span className="section-kicker">{t("doctorLabel")}</span><h2>{common("brandFull")}</h2><blockquote className="doctor-mobile-quote">{t("quote")}</blockquote></div><div><h3>{t("doctorTitle")}</h3><p>{t("doctorText")}</p></div><div className="doctor-disciplines">{(t.raw("disciplines") as string[]).map(item => <span key={item}>{item}</span>)}</div></section>

        <section id="journey" className="site-container landing-section"><div className="section-heading centered"><p className="section-kicker">{t("journeyLabel")}</p><h2>{t("journeyTitle")}<br /><span>{t("journeyEnd")}</span></h2><p>{t("journeyText")}</p></div><ol className="journey-steps">{steps.map((step, i) => <li key={step.title}><div className="journey-step-top"><span>{new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(i + 1)}</span><span className="journey-step-line" aria-hidden="true" /></div><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>

        <section id="pathways" className="site-container landing-section services-section"><div className="section-heading split-heading"><div><p className="section-kicker">{t("servicesLabel")}</p><h2>{t("servicesTitle")}</h2></div><p>{t("servicesText")}</p></div><div className="service-explorer"><ChoiceTabs id="service" label={t("serviceTabs")} labels={services.map(item => item.title)} selected={service} onSelect={setService} className="service-tabs" /><div className="service-panel" id={`service-panel-${service}`} role="tabpanel" tabIndex={0} aria-labelledby={`service-tab-${service}`}><div className="service-panel-icon"><ServiceIcon size={39} strokeWidth={1.3} aria-hidden="true" /></div><span className="section-kicker">{selectedService.title}</span><h3>{selectedService.subtitle}</h3><p>{selectedService.text}</p><div className="service-tags">{selectedService.tags.map(tag => <span key={tag}>{tag}</span>)}</div>{action(t("serviceAction"), service === 4 ? destinations[1] : service > 1 && service !== 4 ? destinations[2] : destinations[0])}{note}</div></div><p className="assessment-disclaimer">{t("assessmentNote")}</p></section>

        <section id="nutrition" className="nutrition-section"><div className="site-container nutrition-inner"><div className="nutrition-art" aria-hidden="true"><div className="nutrition-orbit"><Leaf size={62} strokeWidth={1} /></div><span className="nutrition-spark"><Sparkles size={24} strokeWidth={1.3} /></span><span className="nutrition-dot" /></div><div className="nutrition-copy"><p className="section-kicker">{t("nutritionLabel")}</p><h2>{t("nutritionTitle")}</h2><p>{t("nutritionText")}</p>{action(t("nutritionCta"), "/assessment", true)}{note}</div></div></section>

        <section id="couples" className="site-container landing-section couples-section"><div className="couples-copy"><p className="section-kicker">{t("couplesLabel")}</p><h2>{t("couplesTitle")}</h2><p>{t("couplesText")}</p><div className="couples-tags">{(t.raw("couplesTags") as string[]).map(item => <span key={item}><Check size={15} aria-hidden="true" />{item}</span>)}</div>{action(t("couplesCta"), "/assessment/couples", true)}{note}</div><div className="couples-art"><div className="couple-orbit couple-orbit-first" aria-hidden="true" /><div className="couple-orbit couple-orbit-second" aria-hidden="true" /><HeartHandshake size={49} strokeWidth={1.1} aria-hidden="true" /><p>{t("couplesArt")}</p></div></section>

        <section id="consultation" className="site-container landing-section consultation-section"><div className="consultation-copy"><p className="section-kicker">{t("visitLabel")}</p><h2>{t("visitTitle")}</h2><p>{t("visitText")}</p>{action(t("visitCta"), "/appointments/book")}{note}</div><div className="consultation-panel"><span className="consultation-icon"><Stethoscope size={30} strokeWidth={1.4} aria-hidden="true" /></span><h3>{t("visitPanel")}</h3><ul>{(t.raw("visitChecks") as string[]).map((item, i) => <li key={item}><span>{new Intl.NumberFormat(locale).format(i + 1)}</span>{item}<Check size={16} aria-hidden="true" /></li>)}</ul></div></section>

        <section id="shop" className="site-container shop-section"><div className="shop-banner"><div><span className="section-kicker">{t("shopLabel")}</span><h2>{t("shopTitle")}</h2><p>{t("shopText")}</p><div className="shop-buttons"><button className="landing-button" type="button" onClick={() => window.location.assign(patientUrl("/store"))}>{t("shopCta")}<Arrow size={18} aria-hidden="true" /></button>{action(t("shopSecondary"), "/assessment", true)}</div>{note}</div><div className="shop-art" aria-hidden="true"><ShoppingBag size={90} strokeWidth={.85} /><span /><i /></div></div></section>

        <section id="faq" className="site-container landing-section faq-section"><div className="section-heading"><p className="section-kicker">{t("faqLabel")}</p><h2>{t("faqTitle")}</h2></div><div className="faq-list">{faqs.map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary><p>{a}</p></details>)}</div></section>
    </main>;
}

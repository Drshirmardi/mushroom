"use client";

import { useState } from "react";

import { services } from "@/data";
import { Icon } from "@/components/shared/Icon";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { ServiceListItem } from "@/components/shared/ServiceListItem";

export function Services() {
    const [showAllServices, setShowAllServices] = useState(false);

    return (
        <section id="services" className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
            <SectionHeading
                badge="خدمات درمانی تخصصی"
                title="راهکارهای طبیعی و ریشه‌ای"
                subtitle="برای بازگشت به تعادل و ارتقای کیفیت زندگی."
            />

            {/* Desktop grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((s) => (
                    <ServiceCard key={s.title} service={s} />
                ))}
            </div>

            {/* Mobile compact list */}
            <div className="sm:hidden">
                <div className="rounded-3xl bg-card border border-border shadow-premium overflow-hidden divide-y divide-border">
                    {services.slice(0, 3).map((s) => (
                        <ServiceListItem key={s.title} service={s} />
                    ))}
                    <div
                        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ gridTemplateRows: showAllServices ? "1fr" : "0fr" }}
                    >
                        <div className="overflow-hidden">
                            <div className="divide-y divide-border">
                                {services.slice(3).map((s) => (
                                    <ServiceListItem key={s.title} service={s} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowAllServices((v) => !v)}
                    aria-expanded={showAllServices}
                    className="press mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-border glass py-3.5 text-sm font-semibold text-primary active:bg-secondary/60"
                >
                    {showAllServices ? "نمایش کمتر" : "مشاهده همه خدمات"}
                    <Icon
                        name="expand_more"
                        className={`text-lg transition-transform duration-500 ${showAllServices ? "rotate-180" : ""}`}
                    />
                </button>
            </div>
        </section>
    );
}

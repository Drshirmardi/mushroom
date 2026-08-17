"use client";

import { useState } from "react";

import { faqs } from "@/data";
import { Icon } from "@/components/shared/Icon";
import { SectionHeading } from "@/components/shared/SectionHeading";

export function Faq() {
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    return (
        <section className="max-w-3xl mx-auto px-5 md:px-8 py-14 md:py-20">
            <SectionHeading
                badge="پرسش و پاسخ"
                title="سوالات متداول"
            />
            <div className="space-y-3">
                {faqs.map((f, i) => (
                    <div
                        key={i}
                        className={`rounded-2xl bg-card border overflow-hidden shadow-premium transition-colors duration-300 ${openFaq === i ? "border-primary/35" : "border-border"}`}
                    >
                        <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            aria-expanded={openFaq === i}
                            className="press w-full flex items-center justify-between gap-3 p-4 md:p-5 text-right hover:bg-secondary/50"
                        >
                            <span className="font-semibold text-[15px] md:text-base">{f.q}</span>
                            <Icon
                                name="expand_more"
                                className={`text-primary shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                            />
                        </button>
                        <div
                            className="grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
                        >
                            <div className="overflow-hidden">
                                <div className="px-4 md:px-5 pb-5 text-sm md:text-base text-muted-foreground leading-[2] border-t border-border pt-4">
                                    {f.a}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

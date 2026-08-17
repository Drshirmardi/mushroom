import type { Service } from "@/types";

import { Icon } from "./Icon";

export function ServiceCard({ service }: { service: Service }) {
    return (
        <div className="group rounded-3xl bg-card border border-border p-7 shadow-premium hover:shadow-glow hover:-translate-y-1.5 hover:border-primary/30 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:gradient-hero group-hover:text-primary-foreground group-hover:scale-105 transition-all duration-300">
                <Icon name={service.icon} className="text-3xl" />
            </div>
            <h3 className="text-lg font-bold mb-2">{service.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{service.desc}</p>
            <a
                href="#"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all"
            >
                جزئیات درمان
                <Icon name="arrow_back" className="text-base" />
            </a>
        </div>
    );
}

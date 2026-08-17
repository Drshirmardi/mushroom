import type { Service } from "@/types";

import { Icon } from "./Icon";

export function ServiceListItem({ service }: { service: Service }) {
    return (
        <a
            href="#"
            className="press flex items-center gap-3.5 px-4 py-3.5 active:bg-secondary/60"
        >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon name={service.icon} className="text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-semibold text-[15px] leading-tight truncate">{service.title}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{service.short}</div>
            </div>
            <Icon name="chevron_left" className="text-muted-foreground shrink-0" />
        </a>
    );
}

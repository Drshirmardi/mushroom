"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  trendVal?: string;
  iconBg: string;
}

export function KpiCard({ title, value, sub, icon: Icon, trend, trendVal, iconBg }: KpiCardProps) {
  return (
    <div className="dashboard-card dashboard-kpi p-5" onPointerMove={event => {
      if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
      event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
    }}>
      <div className="flex items-start justify-between mb-4">
        <div className={`dashboard-kpi-icon w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}><Icon size={19} aria-hidden="true" /></div>
        {trendVal && <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>{trend === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trendVal}</span>}
      </div>
      <p className="text-[1.6rem] font-bold text-foreground leading-snug mb-1 break-words tabular-nums">{value}</p>
      <p className="text-[0.8rem] text-muted-foreground">{title}</p>
      {sub && <p className="text-[0.72rem] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

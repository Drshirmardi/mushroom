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
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}><Icon size={22} /></div>
        {trendVal && <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>{trend === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trendVal}</span>}
      </div>
      <p className="text-[1.6rem] font-bold text-foreground leading-none mb-1">{value}</p>
      <p className="text-[0.8rem] text-muted-foreground">{title}</p>
      {sub && <p className="text-[0.72rem] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

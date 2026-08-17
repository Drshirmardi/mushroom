"use client";

import { useState } from "react";
import { User } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PATIENTS } from "@/data/patients";
import { HEALTH_DATA, HEALTH_METRIC_CONFIGS } from "@/data/health";
import type { HealthMetric } from "@/data/health";
import { Avatar } from "@/components/shared";
import { p } from "@/lib/utils";

export function HealthTrackingPage() {
  const [metric, setMetric] = useState<HealthMetric>("pain");
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2"><User size={16} className="text-muted-foreground" /><select className="bg-secondary rounded-xl px-3 py-2 text-sm font-semibold outline-none">{PATIENTS.map(p => <option key={p.id}>{p.name}</option>)}</select></div>
        <div className="flex items-center gap-1.5 mr-auto">
          {(Object.keys(HEALTH_METRIC_CONFIGS) as HealthMetric[]).map((k) => (
            <button key={k} onClick={() => setMetric(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${metric === k ? "text-white shadow-sm" : "bg-secondary text-muted-foreground"}`} style={metric === k ? { background: HEALTH_METRIC_CONFIGS[k].color } : {}}>{HEALTH_METRIC_CONFIGS[k].label}</button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">{HEALTH_METRIC_CONFIGS[metric].label} — ۱۴ روز گذشته</h2></div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={HEALTH_DATA[metric]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => [`${v}${HEALTH_METRIC_CONFIGS[metric].unit}`, HEALTH_METRIC_CONFIGS[metric].label]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke={HEALTH_METRIC_CONFIGS[metric].color} strokeWidth={2.5} dot={{ fill: HEALTH_METRIC_CONFIGS[metric].color, r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">وضعیت همه بیماران</h2></div>
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{["بیمار", "سطح درد", "خواب", "استرس", "حال و هوا", "روند"].map(h => <th key={h} className="text-right px-5 py-3 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {PATIENTS.map((pt, i) => {
              const vals = [3, 5, 4, 6, 7, 4][i] ?? 5;
              const painVal = [3, 6, 4, 8, 5, 7][i] ?? 5;
              const trend = ["↑ بهبود", "→ ثابت", "↑ بهبود", "↓ بدتر", "↑ بهبود", "→ ثابت"][i];
              const tc = trend.includes("↑") ? "text-emerald-600" : trend.includes("↓") ? "text-red-500" : "text-muted-foreground";
              return (
                <tr key={pt.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar letter={pt.avatar} size="xs" /><span className="text-sm font-semibold">{pt.name}</span></div></td>
                  {[painVal, vals, 9 - vals, vals].map((v, ci) => (
                    <td key={ci} className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v * 10}%`, background: ["#EF4444", "#6366F1", "#F97316", "#10B981"][ci] }} /></div><span className="text-xs font-bold">{p(v)}</span></div></td>
                  ))}
                  <td className="px-5 py-3.5"><span className={`text-xs font-bold ${tc}`}>{trend}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

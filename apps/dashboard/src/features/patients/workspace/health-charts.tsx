"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { HEALTH_DATA, HEALTH_METRIC_CONFIGS } from "@/data/health";
import type { HealthMetric } from "@/data/health";

export function HealthCharts() {
  const [metric, setMetric] = useState<HealthMetric>("pain");
  const cfg = HEALTH_METRIC_CONFIGS[metric];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(HEALTH_METRIC_CONFIGS) as HealthMetric[]).map((k) => (
          <button key={k} onClick={() => setMetric(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${metric === k ? "text-white shadow-sm" : "bg-secondary text-muted-foreground"}`}
            style={metric === k ? { background: HEALTH_METRIC_CONFIGS[k].color } : {}}>
            {HEALTH_METRIC_CONFIGS[k].label}
          </button>
        ))}
      </div>
      <div className="bg-secondary/40 rounded-xl p-1">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={HEALTH_DATA[metric]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6B8C7A" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip formatter={(v: number) => [`${v}${cfg.unit}`, cfg.label]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 11 }} />
            <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2.5} dot={{ fill: cfg.color, r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[["میانگین", "۵.۸"], ["بهترین", "۲"], ["بدترین", "۸"], ["روند", "بهبود ↑"]].map(([l, v]) => (
          <div key={l} className="bg-secondary rounded-xl p-3 text-center"><p className="text-sm font-bold text-foreground">{v}</p><p className="text-xs text-muted-foreground mt-0.5">{l}</p></div>
        ))}
      </div>
    </div>
  );
}

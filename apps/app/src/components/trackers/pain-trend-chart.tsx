"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toP } from "@/lib/format";

export type PainChartPoint = { day: string; value: number };

export default function PainTrendChart({ data }: { data: PainChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data}>
        <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--dp-brand)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--dp-brand)" stopOpacity={0} /></linearGradient></defs>
        <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "Yekan Bakh" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 10]} hide />
        <Tooltip contentStyle={{ fontFamily: "Yekan Bakh", fontSize: 12, borderRadius: 12 }} formatter={(v) => [toP(v as number), "درد"]} />
        <Area type="monotone" dataKey="value" stroke="var(--dp-brand)" strokeWidth={2.5} fill="url(#pg)" dot={{ fill: "var(--dp-brand)", r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

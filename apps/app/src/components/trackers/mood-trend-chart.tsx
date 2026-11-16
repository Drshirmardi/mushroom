"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export type MoodChartPoint = { day: string; mood?: number; sleep?: number; energy?: number };

export default function MoodTrendChart({ data }: { data: MoodChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={data}>
        <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "Yekan Bakh" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontFamily: "Yekan Bakh", fontSize: 11, borderRadius: 12 }} />
        <Line type="monotone" dataKey="mood" stroke="var(--dp-brand)" strokeWidth={2} dot={false} name="خلق" />
        <Line type="monotone" dataKey="sleep" stroke="var(--dp-brand)" strokeWidth={2} dot={false} name="خواب" />
        <Line type="monotone" dataKey="energy" stroke="var(--dp-warning)" strokeWidth={2} dot={false} name="انرژی" />
      </LineChart>
    </ResponsiveContainer>
  );
}

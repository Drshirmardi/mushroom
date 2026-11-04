"use client";
import { useEffect, useId, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import styles from './mizaj-chart.module.css';
export function mizajPercentages(scores: Record<string, number>, dimensions: { id: string }[]) {
  const total = dimensions.reduce((sum, item) => sum + Math.max(0, scores[item.id] || 0), 0);
  if (!total) return [];
  const raw = dimensions.map(item => Math.max(0, scores[item.id] || 0) / total * 1000);
  const units = raw.map(Math.floor);
  const order = raw.map((value, index) => ({ index, remainder: value - units[index] })).sort((a, b) => b.remainder - a.remainder);
  const rest = 1000 - units.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < rest; i++) units[order[i].index]++;
  return units;
}

export function MizajChart({ scores = {}, dimensions = [], variant = 'full', isLoading = false }: { scores?: Record<string, number>; dimensions?: { id: string; title: string }[]; variant?: 'full' | 'semi'; isLoading?: boolean }) {
  const colors = ['#0d9488', '#2563eb', '#d97706', '#a855f7'];
  const reducedMotion = useReducedMotion();
  const chartId = useId().replace(/:/g, '');
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!isLoading || reducedMotion) return;
    const timer = window.setInterval(() => setPhase(value => (value + 1) % 4), 1500);
    return () => window.clearInterval(timer);
  }, [isLoading, reducedMotion]);
  const units = mizajPercentages(scores, dimensions);
  if (!isLoading && !units.length) return <p className="text-sm leading-7 text-muted-foreground">پاسخ مؤثر کافی برای نمایش درصد گرایش‌ها ثبت نشده است.</p>;
  // Adapted from EvilCharts' MIT radial chart: fixed angle domain, rounded tracks,
  // full/semi variants and muted animated loading bars. See adjacent license.
  const data = isLoading
    ? [58, 82, 46, 70].map((_, index, values) => ({ value: values[(index + phase) % values.length], fill: 'var(--muted-foreground)', fillOpacity: 0.25 }))
    : dimensions.map((item, index) => ({ name: item.title, value: units[index] / 10, fill: `url(#${chartId}-${index})` }));
  return <figure className={styles.figure} data-variant={variant} aria-busy={isLoading}>
    <figcaption className={styles.caption}>{isLoading ? <span role="status">در حال آماده‌سازی نمودار…</span> : 'ترکیب گرایش‌های شما'}</figcaption>
    <div className={styles.visual} aria-hidden="true"><div className={styles.canvas}>
      <ResponsiveContainer width="100%" aspect={1} minWidth={0}>
        <RadialBarChart barSize={14} data={data} innerRadius="30%" outerRadius="95%" startAngle={variant === 'semi' ? 180 : 90} endAngle={variant === 'semi' ? 0 : -270} cx="50%" cy="50%">
          <defs>{dimensions.map((item, index) => <linearGradient key={item.id} id={`${chartId}-${index}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity={0.5} /><stop offset="100%" stopColor={colors[index % colors.length]} /></linearGradient>)}</defs>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="value" cornerRadius={5} background={{ fill: 'var(--border)', fillOpacity: 0.45 }} isAnimationActive={!reducedMotion} animationDuration={isLoading ? 1500 : 700} animationEasing="ease-in-out" />
        </RadialBarChart>
      </ResponsiveContainer>
    </div></div>
    {isLoading ? <div className={styles.loadingLegend} aria-hidden="true">{[0, 1, 2, 3].map(index => <span key={index} />)}</div> : <dl className={styles.legend}>{dimensions.map((item, index) => <div key={item.id}><dt><span aria-hidden="true" style={{ background: colors[index % colors.length] }} />{item.title}</dt><dd>{(units[index] / 10).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}٪</dd></div>)}</dl>}
  </figure>;
}

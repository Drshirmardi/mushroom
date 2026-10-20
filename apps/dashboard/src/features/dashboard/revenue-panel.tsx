"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, RefreshCw, TrendingUp } from "lucide-react";
import { CommerceRevenueApiError, getCommerceRevenue, type CommerceRevenue } from "@/lib/commerce-revenue-api";

type RevenueState = { status: "loading" } | { status: "error" | "forbidden" } | { status: "ready"; data: CommerceRevenue };
const ranges = [{ days: 7, label: "۷ روز" }, { days: 30, label: "۳۰ روز" }, { days: 90, label: "۹۰ روز" }];
const money = (amount: string | bigint) => BigInt(amount).toLocaleString("fa-IR");
const dateLabel = (date: string) => new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short", timeZone: "Asia/Tehran" }).format(new Date(`${date}T12:00:00Z`));

function shortMoney(amount: bigint) {
  const absolute = amount < 0n ? -amount : amount;
  const unit = absolute >= 1_000_000_000_000n ? { size: 1_000_000_000_000n, label: "تریلیون" }
    : absolute >= 1_000_000_000n ? { size: 1_000_000_000n, label: "میلیارد" }
    : absolute >= 1_000_000n ? { size: 1_000_000n, label: "میلیون" }
    : absolute >= 1_000n ? { size: 1_000n, label: "هزار" } : null;
  if (!unit) return money(amount);
  const whole = absolute / unit.size;
  const decimal = (absolute % unit.size) * 10n / unit.size;
  return `${amount < 0n ? "−" : ""}${money(whole)}${decimal ? `٫${money(decimal)}` : ""} ${unit.label}`;
}

export function useRevenueReport(accessToken: string, refreshVersion: number) {
  const [days, setDays] = useState(30);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<RevenueState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    const parts = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (type: string) => parts.find(item => item.type === type)?.value;
    const to = `${part("year")}-${part("month")}-${part("day")}`;
    const start = new Date(`${to}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - days + 1);
    void getCommerceRevenue(accessToken, { from: start.toISOString().slice(0, 10), to, granularity: "DAY" }).then(
      data => { if (active) setState({ status: "ready", data }); },
      (error: unknown) => { if (active) setState({ status: error instanceof CommerceRevenueApiError && [401, 403].includes(error.status) ? "forbidden" : "error" }); },
    );
    return () => { active = false; };
  }, [accessToken, days, refreshVersion, retry]);
  return { days, state, changeRange: (value: number) => { if (value !== days) { setState({ status: "loading" }); setDays(value); } }, retry: () => setRetry(value => value + 1) };
}

function RevenueChart({ data }: { data: CommerceRevenue }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(650);
  useEffect(() => {
    if (!plot.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(260, entries[0].contentRect.width)));
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const series = data.series;
  if (!series.length) return <div className="dashboard-empty flex min-h-64 flex-col items-center justify-center gap-3"><TrendingUp size={30} strokeWidth={1.25} aria-hidden="true" /><p>در این بازه پرداخت یا بازپرداختی ثبت نشده است.</p></div>;

  const amounts = series.map(point => BigInt(point.netRevenueToman));
  const min = amounts.reduce((current, value) => value < current ? value : current, 0n);
  const max = amounts.reduce((current, value) => value > current ? value : current, 0n);
  const span = max - min || 1n;
  // Convert only bounded plot coordinates to Number; displayed financial values stay exact.
  const y = (amount: bigint) => 206 - Number((amount - min) * 10_000n / span) / 10_000 * 180;
  const firstDay = Date.parse(data.from);
  const duration = Math.max(Date.parse(data.to) - firstDay, 86_400_000);
  const right = width - 20;
  const x = (index: number) => 76 + (Date.parse(series[index].date) - firstDay) / duration * (right - 76);
  const path = amounts.map((amount, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(amount).toFixed(2)}`).join(" ");
  const index = Math.min(active ?? series.length - 1, series.length - 1);
  const selected = series[index];

  return <>
    <div className="flex flex-wrap items-center justify-between gap-2 px-6 text-xs text-muted-foreground"><span>{dateLabel(selected.date)}</span><span>درآمد خالص <strong className="ms-1 font-semibold text-foreground">{money(selected.netRevenueToman)} تومان</strong></span></div>
    <div className="px-2 pt-3 sm:px-4" dir="ltr"><div ref={plot}>
      <svg viewBox={`0 0 ${width} 245`} className="block h-[245px] w-full" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>درآمد عملیاتی خالص به تومان</title>
        <desc id={`${id}-desc`}>نقاط مربوط به روزهای دارای پرداخت یا بازپرداخت‌اند. برای مقدار دقیق هر روز از انتخابگر یا جدول زیر نمودار استفاده کنید.</desc>
        <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".18" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
        {(max === min ? [0] : [0, 1, 2, 3, 4]).map(tick => {
          const amount = min + (max - min) * BigInt(tick) / 4n;
          const top = 206 - tick * 45;
          return <g key={tick}><line x1="76" x2={right} y1={top} y2={top} stroke="var(--border)" strokeDasharray="3 5" /><text x="64" y={top + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="10">{shortMoney(amount)}</text></g>;
        })}
        <path d={`${path} L${x(series.length - 1)},${y(0n)} L${x(0)},${y(0n)} Z`} fill={`url(#${id}-fill)`} />
        <path key={`${data.from}-${data.asOf}`} d={path} className="dashboard-chart-line" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(index)} x2={x(index)} y1="20" y2="206" stroke="var(--accent)" strokeOpacity=".25" strokeDasharray="3 4" />
        {series.map((point, position) => <circle key={point.date} cx={x(position)} cy={y(amounts[position])} r={position === index ? 5 : 3} fill="var(--card)" stroke="var(--accent)" strokeWidth="2" onPointerEnter={() => setActive(position)}><title>{dateLabel(point.date)}: {money(point.netRevenueToman)} تومان</title></circle>)}
        <text x="76" y="235" fill="var(--muted-foreground)" fontSize="11">{dateLabel(data.from)}</text>
        <text x={right} y="235" textAnchor="end" fill="var(--muted-foreground)" fontSize="11">{dateLabel(data.to)}</text>
      </svg>
    </div></div>
    {series.length > 1 && <div className="mx-6 mb-4 flex items-center gap-3 text-xs text-muted-foreground" dir="ltr"><input aria-label="انتخاب روز نمودار درآمد" aria-valuetext={`${dateLabel(selected.date)}، ${money(selected.netRevenueToman)} تومان`} type="range" min="0" max={series.length - 1} value={index} onChange={event => setActive(Number(event.target.value))} className="min-h-8 w-full accent-[var(--accent)]" /></div>}
    <p className="mx-6 mb-2 text-[11px] leading-6 text-muted-foreground">نقاط فقط روزهای دارای پرداخت یا بازپرداخت را نشان می‌دهند.</p>
    <details className="mx-6 mb-5 text-xs"><summary className="py-2 text-muted-foreground">مشاهدهٔ ارقام دقیق</summary><div className="max-h-64 overflow-auto rounded-lg border border-border"><table className="dashboard-table"><caption className="sr-only">مقادیر دقیق گزارش درآمد، به تومان</caption><thead><tr><th scope="col">روز</th><th scope="col">دریافتی</th><th scope="col">بازپرداخت</th><th scope="col">خالص</th></tr></thead><tbody>{series.map(point => <tr key={point.date}><td>{dateLabel(point.date)}</td><td>{money(point.grossCapturedToman)}</td><td>{money(point.completedRefundToman)}</td><td>{money(point.netRevenueToman)}</td></tr>)}</tbody></table></div></details>
  </>;
}

export function RevenuePanel({ report }: { report: ReturnType<typeof useRevenueReport> }) {
  const { state, days, changeRange, retry } = report;
  return <section className="dashboard-card" aria-labelledby="revenue-title">
    <div className="dashboard-card-head"><div><h2 id="revenue-title">نمای کلی درآمد</h2><p>پرداخت‌های تأییدشده و بازپرداخت‌های تکمیل‌شده</p></div><div className="dashboard-segmented" role="group" aria-label="بازهٔ گزارش درآمد">{ranges.map(range => <button key={range.days} type="button" aria-pressed={days === range.days} onClick={() => changeRange(range.days)}>{range.label}</button>)}</div></div>
    {state.status === "loading" ? <div className="dashboard-empty min-h-80" role="status">در حال دریافت گزارش درآمد…</div> : state.status !== "ready" ? <div className="dashboard-empty min-h-80" role="alert"><AlertCircle className="mx-auto mb-3" size={24} aria-hidden="true" /><p>{state.status === "forbidden" ? "دسترسی به گزارش درآمد مجاز نیست." : "گزارش درآمد دریافت نشد."}</p>{state.status === "error" && <button className="dashboard-button mt-4" onClick={retry}><RefreshCw size={15} />تلاش دوباره</button>}</div> : <>
      <div className="flex flex-wrap items-baseline gap-2 px-6 pb-5"><strong className="min-w-0 max-w-full text-3xl font-extrabold tracking-tight tabular-nums [overflow-wrap:anywhere]">{money(state.data.netRevenueToman)}</strong><span className="text-xs text-muted-foreground">تومان خالص</span><span className="dashboard-badge ms-auto">{new Intl.NumberFormat("fa-IR").format(state.data.successfulPaymentCount)} پرداخت موفق</span></div>
      <RevenueChart key={`${state.data.from}-${state.data.to}-${state.data.asOf}`} data={state.data} />
      <div className="grid grid-cols-2 gap-4 border-t border-border px-6 py-4 text-xs"><div className="space-y-1"><p className="text-muted-foreground">دریافتی</p><p className="break-words font-semibold">{money(state.data.grossCapturedToman)} تومان</p></div><div className="space-y-1"><p className="text-muted-foreground">بازپرداخت تکمیل‌شده</p><p className="break-words font-semibold">{money(state.data.completedRefundToman)} تومان</p></div></div>
      <p className="border-t border-border px-6 py-3 text-[11px] leading-6 text-muted-foreground">{dateLabel(state.data.from)} تا {dateLabel(state.data.to)} · {state.data.sourceStatus === "current" ? "دادهٔ جاری" : state.data.sourceStatus === "partial" ? "دادهٔ ناقص" : "دادهٔ قدیمی"} · آخرین پاسخ {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: state.data.timeZone }).format(new Date(state.data.asOf))}<br />درآمد عملیاتی فروشگاه؛ تسویهٔ بانکی محسوب نمی‌شود.</p>
    </>}
  </section>;
}

"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronLeft, RefreshCw, Search, X } from "lucide-react";
import { getGatewayRequest, listGatewayRequests, PaymentProviderApiError, type GatewayRequest, type GatewayRequestDetail, type GatewayRequestsPage, type GatewayRequestsQuery } from "@/lib/commerce-payment-provider-api";

const field = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50";
const statuses: Record<string, string> = { CREATED: "درخواست ایجادشده", REDIRECT_READY: "آمادهٔ رفتن به درگاه", CALLBACK_RECEIVED: "بازگشت از درگاه", VERIFYING: "در حال تأیید بانکی", VERIFIED: "پرداخت تأییدشده", FAILED: "ناموفق", EXPIRED: "منقضی", REQUIRES_RECONCILIATION: "نیازمند تطبیق" };
const purposes: Record<string, string> = { TOPUP: "شارژ کیف پول", ORDER: "سفارش", APPOINTMENT: "نوبت", ASSESSMENT: "ارزیابی", PROGRAM: "برنامه" };
const stages: Record<string, string> = { REQUEST: "درخواست اولیه به سداد", CALLBACK: "بازگشت مرورگر از سداد", VERIFY: "تأیید سروری با سداد" };
const outcomes: Record<string, string> = { SUCCESS: "پاسخ موفق این مرحله", REJECTED: "پاسخ ناموفق این مرحله", RECEIVED: "دریافت شد؛ نتیجهٔ قطعی نیست", ERROR: "خطا در اجرای مرحله" };
const errors: Record<string, string> = { HTTP: "پاسخ HTTP ناموفق از سداد", TIMEOUT: "مهلت پاسخ‌گویی سداد تمام شد", NETWORK: "ارتباط شبکه با سداد برقرار نشد", INVALID_RESPONSE: "پاسخ سداد قابل پردازش نبود", PROTOCOL_OR_CONFIGURATION: "قالب پاسخ یا تنظیمات آداپتور معتبر نبود" };
const localCodes: Record<string, string> = { REQUEST_AMBIGUOUS: "پاسخ درخواست اولیه قطعی نشده است؛ تطبیق لازم است.", VERIFY_TIMEOUT: "تأیید سروری کامل نشده است؛ رخدادهای همان مرحله را بررسی کنید.", SETTLEMENT_RETRY: "پاسخ تأیید دریافت شده، اما ثبت نهایی پرداخت نیازمند پیگیری است.", MANUAL_FAILED: "پرداخت با بررسی دستی ناموفق ثبت شده است.", TIMEOUT: "مرحلهٔ ارتباط با درگاه کامل نشده است.", MALFORMED_RESPONSE: "پاسخ درخواست اولیه ناقص بوده است." };
const date = (value: string) => new Date(value).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "medium" });
const money = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} ریال`;
const normalize = (value: string) => value.replace(/[۰-۹٠-٩]/gu, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
function message(error: unknown) { return error instanceof PaymentProviderApiError && [401, 403].includes(error.status) ? "اجازهٔ مشاهدهٔ درخواست‌های درگاه را ندارید." : "دریافت سوابق انجام نشد؛ دوباره تلاش کنید."; }
function Status({ value }: { value: string }) { return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${value === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : ["FAILED", "EXPIRED"].includes(value) ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{statuses[value] ?? value}</span>; }
function DetailField({ label, children, ltr = false }: { label: string; children: ReactNode; ltr?: boolean }) { return <div className="min-w-0 rounded-xl bg-secondary/40 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd dir={ltr ? "ltr" : undefined} className="mt-1 break-all text-sm font-semibold">{children ?? "ثبت نشده"}</dd></div>; }

export function PaymentProviderRequests({ token, provider }: { token: string; provider: string }) {
  const [filters, setFilters] = useState({ query: "", status: "", from: "", until: "" });
  const [query, setQuery] = useState<GatewayRequestsQuery>({ page: 1, pageSize: 20 });
  const [storedData, setData] = useState<GatewayRequestsPage | null>(null);
  const [finishedRequest, setFinishedRequest] = useState<object | null>(null); const [errorState, setError] = useState(""); const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<GatewayRequest | null>(null);
  const request = useMemo(() => ({ token, provider, query, revision }), [token, provider, query, revision]);
  const loading = finishedRequest !== request;
  const data = loading ? null : storedData;
  const error = loading ? "" : errorState;
  useEffect(() => {
    let active = true;
    listGatewayRequests(token, provider, query).then(value => { if (active) { setData(value); setError(""); } }).catch(reason => { if (active) setError(message(reason)); }).finally(() => { if (active) setFinishedRequest(request); });
    return () => { active = false; };
  }, [token, provider, query, revision, request]);
  const search = (event: FormEvent) => {
    event.preventDefault();
    setQuery({ page: 1, pageSize: 20, query: normalize(filters.query.trim()) || undefined, status: (filters.status || undefined) as GatewayRequestsQuery["status"], from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined, until: filters.until ? new Date(`${filters.until}T23:59:59.999`).toISOString() : undefined });
  };
  return <section className="space-y-4" aria-label="درخواست‌های درگاه">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold">درخواست‌ها و رخدادهای درگاه</h4><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">سوابق واقعی همهٔ کاربردهای پرداخت، شامل کیف پول و سفارش‌ها. برای پیگیری یک خطا، شناسهٔ پرداخت یا درخواست را جست‌وجو و جزئیات آن را باز کنید.</p></div><button type="button" className={button} onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={16} />بازخوانی</button></div>
    <form onSubmit={search} className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-2 text-xs font-semibold sm:col-span-2 lg:col-span-4">جست‌وجو با نام، موبایل، شناسهٔ پرداخت / درخواست / سفارش، شمارهٔ سداد یا کد پاسخ<input className={field} maxLength={128} value={filters.query} onChange={event => setFilters(value => ({ ...value, query: event.target.value }))} placeholder="شناسه یا مشخصات کاربر را وارد کنید" /></label>
      <label className="space-y-2 text-xs font-semibold">وضعیت<select className={field} value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}><option value="">همهٔ وضعیت‌ها</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-2 text-xs font-semibold">از تاریخ ایجاد (میلادی)<input type="date" className={field} value={filters.from} max={filters.until || undefined} onChange={event => setFilters(value => ({ ...value, from: event.target.value }))} /></label>
      <label className="space-y-2 text-xs font-semibold">تا تاریخ ایجاد (میلادی)<input type="date" className={field} value={filters.until} min={filters.from || undefined} onChange={event => setFilters(value => ({ ...value, until: event.target.value }))} /></label>
      <button type="submit" className={`${button} self-end bg-primary text-primary-foreground hover:bg-primary/90`} disabled={loading}><Search size={16} />اعمال فیلتر</button>
    </form>
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" className={button} onClick={() => setRevision(value => value + 1)}>تلاش دوباره</button></div>}
    {loading && <p role="status" className="py-6 text-center text-sm text-muted-foreground">در حال دریافت سوابق…</p>}
    {data && <><p role="status" className="text-xs text-muted-foreground">{data.total.toLocaleString("fa-IR")} درخواست مطابق فیلترها</p>
      <div className="space-y-3">{data.items.map(item => <button type="button" key={`${item.source}:${item.id}`} onClick={() => setSelected(item)} className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-right transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{item.name || "کاربر بدون نام ثبت‌شده"}</span><span dir="ltr" className="text-sm text-muted-foreground">{item.phone}</span></div><p className="text-xs text-muted-foreground">{purposes[item.purpose] ?? item.purpose} · {date(item.createdAt)}</p><p className="break-all text-xs text-muted-foreground">شناسهٔ پرداخت: <bdi>{item.id}</bdi></p></div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end"><div className="space-y-2 sm:text-left"><p className="text-sm font-bold">{money(item.amountRial)}</p><Status value={item.status} /><p className="text-xs text-muted-foreground">آخرین کد ثبت‌شده: <bdi>{item.resultCode ?? "—"}</bdi></p></div><span className="inline-flex items-center text-xs font-bold text-primary">جزئیات<ChevronLeft size={16} /></span></div>
      </button>)}{!data.items.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">درخواستی مطابق این فیلترها یافت نشد.</p>}</div>
      <div className="flex items-center justify-between gap-2"><button className={button} disabled={loading || query.page === 1} onClick={() => setQuery(value => ({ ...value, page: value.page - 1 }))}>قبلی</button><span className="text-xs">صفحهٔ {query.page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(data.total / query.pageSize)).toLocaleString("fa-IR")}</span><button className={button} disabled={loading || query.page * query.pageSize >= data.total} onClick={() => setQuery(value => ({ ...value, page: value.page + 1 }))}>بعدی</button></div>
    </>}
    {selected && <RequestDetail key={`${provider}:${selected.source}:${selected.id}`} token={token} provider={provider} selected={selected} onClose={() => setSelected(null)} />}
  </section>;
}

function RequestDetail({ token, provider, selected, onClose }: { token: string; provider: string; selected: GatewayRequest; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const title = useId(); const [storedDetail, setDetail] = useState<GatewayRequestDetail | null>(null);
  const [errorState, setError] = useState(""); const [finishedRequest, setFinishedRequest] = useState<object | null>(null); const [revision, setRevision] = useState(0);
  const request = useMemo(() => ({ token, provider, source: selected.source, id: selected.id, revision }), [token, provider, selected.source, selected.id, revision]);
  const loading = finishedRequest !== request;
  const detail = loading ? null : storedDetail;
  const error = loading ? "" : errorState;
  useEffect(() => {
    const node = dialog.current; const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; node?.showModal();
    return () => { node?.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    getGatewayRequest(token, provider, selected.source, selected.id).then(value => { if (active) { setDetail(value); setError(""); } }).catch(reason => { if (active) setError(message(reason)); }).finally(() => { if (active) setFinishedRequest(request); });
    return () => { active = false; };
  }, [token, provider, selected.source, selected.id, revision, request]);
  const item = detail?.request;
  return <dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} className="m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-4xl overflow-y-auto rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background p-4"><div><h3 id={title} className="font-bold">جزئیات درخواست سداد</h3><p className="mt-1 text-xs text-muted-foreground">وضعیت پرداخت و پاسخ‌های هر مرحله</p></div><div className="flex gap-2"><button className={button} aria-label="بازخوانی جزئیات" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={17} /></button><button className={button} aria-label="بستن جزئیات" onClick={onClose}><X size={18} /></button></div></div>
    <div className="space-y-5 p-4 sm:p-6">
      {loading && <p role="status" className="py-6 text-center text-sm">در حال دریافت جزئیات…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {item && detail && <><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{item.name || "کاربر بدون نام ثبت‌شده"}</p><p dir="ltr" className="mt-1 text-right text-sm text-muted-foreground">{item.phone}</p></div><Status value={item.status} /></div>
        <dl className="grid gap-3 sm:grid-cols-2"><DetailField label="مبلغ">{money(item.amountRial)}</DetailField><DetailField label="کاربرد">{purposes[item.purpose] ?? item.purpose}</DetailField><DetailField label="شناسهٔ پرداخت" ltr>{item.id}</DetailField><DetailField label="شمارهٔ سفارش سداد" ltr>{item.providerOrderId}</DetailField><DetailField label="شناسهٔ درخواست پرداخت" ltr>{item.intentId}</DetailField><DetailField label="شناسهٔ سفارش محصول" ltr>{item.orderId}</DetailField><DetailField label="شناسهٔ کاربر" ltr>{item.userId}</DetailField><DetailField label="نسخهٔ تنظیمات پذیرندگی">{item.revisionNumber.toLocaleString("fa-IR")}</DetailField><DetailField label="آخرین کد ثبت‌شده" ltr>{item.resultCode}</DetailField><DetailField label="شمارهٔ مرجع بانکی" ltr>{item.reference}</DetailField><DetailField label="شمارهٔ پیگیری بانکی" ltr>{item.traceNumber}</DetailField><DetailField label="مسیر پرداخت">{item.source === "BILLING" ? "پرداخت یکپارچه" : "سفارش قدیمی"}</DetailField><DetailField label="زمان ایجاد">{date(item.createdAt)}</DetailField><DetailField label="آخرین تغییر">{date(item.updatedAt)}</DetailField><DetailField label="زمان تأیید ثبت‌شده">{item.verifiedAt ? date(item.verifiedAt) : null}</DetailField></dl>
        {item.resultCode && localCodes[item.resultCode] && <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{localCodes[item.resultCode]}</p>}
        <div><h4 className="font-bold">رخدادهای آداپتور</h4><p className="mt-1 text-xs leading-6 text-muted-foreground">پاسخ موفق درخواست اولیه فقط اجازهٔ ورود به درگاه است. نتیجهٔ بازگشت مرورگر هم اثبات پرداخت نیست؛ وضعیت پرداخت پس از تأیید و ثبت سروری تعیین می‌شود. معنی کدهای عددی باید با مرجع سداد تطبیق داده شود.</p></div>
        {!detail.events.length && <p className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">رخداد مرحله‌ای برای این پرداخت ثبت نشده است. در سوابق قدیمی فقط وضعیت و کد ذخیره‌شدهٔ بالا در دسترس است؛ درخواست تازه از این پس جزئیات خواهد داشت.</p>}
        {detail.eventsTruncated && <p className="text-xs text-amber-800">۱۰۰ رخداد آخر نمایش داده می‌شود.</p>}
        <ol className="space-y-3">{detail.events.map(event => <li key={event.id} className={`rounded-xl border p-4 ${["ERROR", "REJECTED"].includes(event.outcome) ? "border-red-200 bg-red-50/40" : "border-border bg-secondary/20"}`}><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-sm font-bold">{stages[event.stage] ?? event.stage}</h5><time dateTime={event.at} className="text-xs text-muted-foreground">{date(event.at)}</time></div><p className="mt-2 text-sm">{outcomes[event.outcome] ?? event.outcome}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>کد سداد: <bdi>{event.resultCode ?? "دریافت نشده"}</bdi></span>{event.httpStatus !== null && <span>HTTP: <bdi>{event.httpStatus}</bdi></span>}{event.stage !== "CALLBACK" && <span>مدت: {event.durationMs.toLocaleString("fa-IR")} میلی‌ثانیه</span>}</div>{event.errorKind && <p className="mt-3 text-sm text-red-800">{errors[event.errorKind] ?? event.errorKind}</p>}</li>)}</ol>
      </>}
    </div>
  </dialog>;
}

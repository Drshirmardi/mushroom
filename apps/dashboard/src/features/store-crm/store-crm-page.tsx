"use client";

import { useCallback, useState } from "react";
import { RefreshCw, Search, ShoppingBag, Star, Users, Wallet } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import {
  CommerceCustomerCrmApiError,
  getCommerceCustomers,
  type CommerceCustomerCrmPage,
  type CommerceCustomerCrmSegment,
  type CommerceCustomerCrmSort,
} from "@/lib/commerce-customer-crm-api";
import { p } from "@/lib/utils";

const segments: Array<{ value: CommerceCustomerCrmSegment | undefined; label: string }> = [
  { value: undefined, label: "همه" },
  { value: "POTENTIAL", label: "بالقوه" },
  { value: "ONE_TIME", label: "یک‌بار خرید" },
  { value: "RETURNING", label: "بازگشتی" },
  { value: "VIP", label: "VIP" },
];

const segmentLabel: Record<CommerceCustomerCrmSegment, string> = {
  POTENTIAL: "بالقوه", ONE_TIME: "یک‌بار خرید", RETURNING: "بازگشتی", VIP: "VIP",
};
const segmentColor: Record<CommerceCustomerCrmSegment, string> = {
  POTENTIAL: "bg-violet-100 text-violet-700", ONE_TIME: "bg-emerald-100 text-emerald-700", RETURNING: "bg-blue-100 text-blue-700", VIP: "bg-amber-100 text-amber-700",
};
const toman = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} تومان`;
const formatDate = (value: string | null | undefined, timeZone: string) => value
  ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value))
  : "—";

export function StoreCrmPage() {
  const { authentication } = useDashboardSession();
  const [clinicId, setClinicId] = useState("");
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<CommerceCustomerCrmSegment>();
  const [sort, setSort] = useState<CommerceCustomerCrmSort>("NET_SPEND");
  const [data, setData] = useState<CommerceCustomerCrmPage | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error" | "forbidden">("idle");

  const load = useCallback(async (page = 1, overrides?: { segment?: CommerceCustomerCrmSegment; search?: string; sort?: CommerceCustomerCrmSort }) => {
    const nextSegment = overrides?.segment ?? segment;
    const nextSearch = overrides?.search ?? search;
    const nextSort = overrides?.sort ?? sort;
    if (!clinicId.trim()) { setData(null); setState("idle"); return; }
    setState("loading");
    try {
      const response = await getCommerceCustomers(authentication.accessToken, {
        clinicId: clinicId.trim(), page, pageSize: 25, search: nextSearch.trim() || undefined,
        segment: nextSegment, sort: nextSort, direction: "DESC",
      });
      setData(response); setState("ready");
    } catch (error) {
      setData(null);
      setState(error instanceof CommerceCustomerCrmApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error");
    }
  }, [authentication.accessToken, clinicId, search, segment, sort]);

  const chooseSegment = (nextSegment: CommerceCustomerCrmSegment | undefined) => {
    setSegment(nextSegment); if (clinicId.trim()) void load(1, { segment: nextSegment });
  };
  const chooseSort = (nextSort: CommerceCustomerCrmSort) => {
    setSort(nextSort); if (clinicId.trim()) void load(1, { sort: nextSort });
  };
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCustomerCount / data.pageSize)) : 1;

  return <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
    <div><h1 className="text-xl font-bold">مشتریان عملیاتی فروشگاه</h1><p className="mt-1 text-sm text-muted-foreground">این فهرست فقط از PatientProfile، Payment تأییدشده و Refund تکمیل‌شدهٔ کلینیک مجاز خوانده می‌شود؛ هیچ دادهٔ پزشکی یا بازاریابی نمایش داده نمی‌شود.</p></div>
    <form className="rounded-2xl border border-border bg-card p-4 shadow-sm" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
      <label className="block text-sm font-bold" htmlFor="crm-clinic-id">شناسهٔ کلینیک مجاز</label><p className="mt-1 text-xs text-muted-foreground">نشست داشبورد کلینیک فعال ذخیره نمی‌کند؛ شناسه فقط برای درخواست scope ارسال و در سرور با دسترسی شما اعتبارسنجی می‌شود.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input id="crm-clinic-id" value={clinicId} onChange={(event) => setClinicId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" autoComplete="off" /><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Search size={16} /> نمایش مشتریان</button></div>
    </form>
    {state === "idle" && <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">برای مشاهدهٔ دادهٔ واقعی، شناسهٔ یک کلینیک مجاز را وارد کنید.</p>}
    {state === "loading" && <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">در حال دریافت مشتریان عملیاتی…</p>}
    {state === "forbidden" && <Notice tone="forbidden" onRetry={() => void load(data?.page ?? 1)} />}
    {state === "error" && <Notice tone="error" onRetry={() => void load(data?.page ?? 1)} />}
    {state === "ready" && data && <CrmResults data={data} search={search} setSearch={setSearch} segment={segment} chooseSegment={chooseSegment} sort={sort} chooseSort={chooseSort} pageCount={pageCount} load={load} />}
  </div>;
}

function Notice({ tone, onRetry }: { tone: "forbidden" | "error"; onRetry: () => void }) {
  const message = tone === "forbidden" ? "دسترسی به این کلینیک یا این قابلیت مجاز نیست." : "دریافت CRM انجام نشد؛ هیچ دادهٔ جایگزینی نمایش داده نمی‌شود.";
  return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"><p>{message}</p><button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-current px-3 py-2 font-bold"><RefreshCw size={15} /> تلاش دوباره</button></div>;
}

function CrmResults({ data, search, setSearch, segment, chooseSegment, sort, chooseSort, pageCount, load }: {
  data: CommerceCustomerCrmPage; search: string; setSearch: (value: string) => void; segment: CommerceCustomerCrmSegment | undefined;
  chooseSegment: (value: CommerceCustomerCrmSegment | undefined) => void; sort: CommerceCustomerCrmSort; chooseSort: (value: CommerceCustomerCrmSort) => void;
  pageCount: number; load: (page?: number, overrides?: { segment?: CommerceCustomerCrmSegment; search?: string; sort?: CommerceCustomerCrmSort }) => Promise<void>;
}) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "کل مشتریان", value: p(data.summary.totalCustomerCount), icon: Users, bg: "bg-primary/10 text-primary" }, { label: "مشتریان VIP", value: p(data.summary.vipCustomerCount), icon: Star, bg: "bg-amber-100 text-amber-700" },
      { label: "مجموع خرید خالص", value: toman(data.summary.netSpendToman), icon: Wallet, bg: "bg-emerald-100 text-emerald-700" }, { label: "میانگین خرید خالص", value: toman(data.summary.averageNetSpendToman), icon: ShoppingBag, bg: "bg-violet-100 text-violet-700" },
    ].map((stat) => <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}><stat.icon size={18} /></div><p className="text-xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.label}</p></div>)}</div>
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between"><form className="flex flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void load(1); }}><label className="sr-only" htmlFor="crm-search">جست‌وجوی نام مشتری</label><input id="crm-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی نام مشتری" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button type="submit" className="rounded-xl border border-border px-3 py-2 text-sm font-bold">جست‌وجو</button></form><label className="text-sm font-bold">مرتب‌سازی<select aria-label="مرتب‌سازی مشتریان" value={sort} onChange={(event) => chooseSort(event.target.value as CommerceCustomerCrmSort)} className="mr-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="NET_SPEND">مبلغ خالص</option><option value="SUCCESSFUL_PURCHASE_COUNT">تعداد خرید موفق</option><option value="LAST_PURCHASE_AT">آخرین خرید</option><option value="DISPLAY_NAME">نام</option></select></label></div>
    <div className="flex flex-wrap gap-2">{segments.map((option) => <button key={option.label} onClick={() => chooseSegment(option.value)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${segment === option.value ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>{option.label}</button>)}</div>
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"><table className="w-full min-w-[860px]"><thead><tr className="border-b border-border bg-secondary/30">{["مشتری", "بخش", "خرید موفق", "خالص خرید", "محصول پرتکرار", "آخرین خرید", "وضعیت حساب"].map((heading) => <th key={heading} className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">{heading}</th>)}</tr></thead><tbody>{data.items.map((customer) => <tr key={customer.patientId} className="border-b border-border last:border-0 hover:bg-secondary/20"><td className="px-5 py-4 text-sm font-semibold">{customer.displayName ?? "بدون نام"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${segmentColor[customer.segment]}`}>{segmentLabel[customer.segment]}</span></td><td className="px-5 py-4 text-sm font-bold">{p(customer.successfulPurchaseCount)}</td><td className="px-5 py-4 text-sm font-semibold text-primary">{toman(customer.netSpendToman)}</td><td className="px-5 py-4 text-sm text-muted-foreground">{customer.topProduct ?? "—"}</td><td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(customer.lastPurchaseAt, data.timeZone)}</td><td className="px-5 py-4 text-sm">{customer.accountStatus === "ACTIVE" ? "فعال" : "غیرفعال"}</td></tr>)}</tbody></table>{data.items.length === 0 && <p className="p-6 text-sm text-muted-foreground">در این scope و فیلتر، مشتری عملیاتی ثبت نشده است.</p>}</div>
    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">صفحهٔ {p(data.page)} از {p(pageCount)} · پاسخ در {data.timeZone}</span><div className="flex gap-2"><button disabled={data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded-xl border border-border px-3 py-2 font-bold disabled:opacity-50">قبلی</button><button disabled={data.page >= pageCount} onClick={() => void load(data.page + 1)} className="rounded-xl border border-border px-3 py-2 font-bold disabled:opacity-50">بعدی</button></div></div>
  </>;
}

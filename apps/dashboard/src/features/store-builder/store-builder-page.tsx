"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw, ShieldAlert } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { apiClient } from "@/lib/api";
import { loadCommerceCatalog, type CommerceCatalogData, type CommerceCatalogState } from "@/lib/commerce-catalog-api";

type ViewState = CommerceCatalogState | { status: "loading" };
const toman = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} تومان`;

function Notice({ state, onRetry }: { state: Exclude<ViewState["status"], "ready" | "loading">; onRetry: () => void }) {
  const title = state === "unauthorized" ? "دسترسی مجاز نیست" : state === "unavailable" ? "سرویس در دسترس نیست" : "دریافت پیش‌نمایش ناموفق بود";
  const body = state === "unauthorized" ? "حساب شما اجازهٔ مشاهدهٔ کاتالوگ مدیریت‌شده را ندارد." : state === "unavailable" ? "اتصال به API برقرار نشد؛ هیچ بنر یا محصول محلی جایگزین نشده است." : "داده‌ای نمایش داده نشد؛ دوباره تلاش کنید.";
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} />{title}</div><p className="mt-2 text-sm">{body}</p>{state !== "unauthorized" && <button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold"><RefreshCw size={15} />تلاش دوباره</button>}</div>;
}

function StorePreview({ data }: { data: CommerceCatalogData }) {
  const active = data.products.filter((product) => product.status === "ACTIVE" && product.category.isActive);
  return <div className="space-y-5"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h1 className="font-bold">پیش‌نمایش فروشگاه</h1><p className="mt-1 text-sm text-muted-foreground">این نما فقط کاتالوگ واقعیِ قابل‌نمایش را نشان می‌دهد. مدیریت بنر، ترتیب‌نمایش و تبلیغات خارج از مرز F09-T03 است.</p><div className="mt-4 flex flex-wrap gap-2">{data.categories.filter((category) => category.isActive).map((category) => <span key={category.id} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold">{category.name} · {category.productCount.toLocaleString("fa-IR")}</span>)}</div></section>{active.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">هنوز محصول فعالِ قابل نمایش وجود ندارد. محصول پیش‌نویس را در «مدیریت فروشگاه» فعال کنید.</div> : <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Eye size={18} className="text-primary" /><h2 className="font-bold">محصولات فعال</h2></div><div className="grid gap-4 md:grid-cols-3">{active.map((product) => <article key={product.id} className="rounded-xl border border-border p-4"><p className="font-bold text-sm">{product.title}</p><p className="mt-1 text-xs text-muted-foreground">{product.category.name}</p><p className="mt-3 text-sm font-bold text-primary">{product.skus[0] ? toman(product.skus[0].currentPriceToman) : "SKU ثبت نشده"}</p><p className="mt-1 text-xs text-muted-foreground">{product.skus[0] ? `${product.skus[0].onHandQuantity.toLocaleString("fa-IR")} عدد موجود` : ""}</p></article>)}</div></section>}</div>;
}

export function StoreBuilderPage() {
  const { authentication } = useDashboardSession(); const [state, setState] = useState<ViewState>({ status: "loading" }); const refresh = useCallback(async () => setState(await loadCommerceCatalog(apiClient, authentication.accessToken)), [authentication.accessToken]);
  useEffect(() => { let cancelled = false; void loadCommerceCatalog(apiClient, authentication.accessToken).then((next) => { if (!cancelled) setState(next); }); return () => { cancelled = true; }; }, [authentication.accessToken]);
  return <div className="flex-1 min-h-0 overflow-y-auto p-7">{state.status === "loading" ? <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">در حال دریافت پیش‌نمایش…</p> : state.status === "ready" ? <StorePreview data={state.data} /> : <Notice state={state.status} onRetry={() => void refresh()} />}</div>;
}

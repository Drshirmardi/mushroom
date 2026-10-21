"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { apiClient } from "@/lib/api";
import { loadCommerceCatalog, type CommerceCatalogData, type CommerceCatalogState } from "@/lib/commerce-catalog-api";
import { bannerErrorMessage, ContentBannerApiError, listAdminBanners, type AdminBanner } from "@/lib/content-banners-api";
import { BannerManager } from "./banner-manager";
import { StorefrontPreview, storefrontSku } from "./storefront-preview";

type ViewState = CommerceCatalogState | { status: "loading" };

function Notice({ state, onRetry }: { state: Exclude<ViewState["status"], "ready" | "loading">; onRetry: () => void }) {
  const title = state === "unauthorized" ? "دسترسی مجاز نیست" : state === "unavailable" ? "سرویس در دسترس نیست" : "دریافت کاتالوگ ناموفق بود";
  const body = state === "unauthorized" ? "حساب شما اجازهٔ مشاهدهٔ کاتالوگ مدیریت‌شده را ندارد." : state === "unavailable" ? "اتصال به API برقرار نشد؛ هیچ دادهٔ محلی جایگزین نشده است." : "داده‌ای نمایش داده نشد؛ دوباره تلاش کنید.";
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} />{title}</div><p className="mt-2 text-sm">{body}</p>{state !== "unauthorized" && <button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold"><RefreshCw size={15} />تلاش دوباره</button>}</div>;
}

function Summary({ catalog, banners }: { catalog: CommerceCatalogData | null; banners: AdminBanner[] | null }) {
  const activeProducts = catalog?.products.filter(product => product.status === "ACTIVE").length ?? 0;
  const outOfStock = catalog?.products.filter(product => { const sku = storefrontSku(product); return product.status === "ACTIVE" && (!sku || Math.max(0, sku.onHandQuantity - sku.reservedQuantity) <= 0); }).length ?? 0;
  const publishedBanners = banners?.filter(banner => banner.publicationStatus === "PUBLISHED" && banner.publishedAt && banner.contentPath).length ?? 0;
  const activeCategories = catalog?.categories.filter(category => category.isActive).length ?? 0;
  const stats = [
    { label: "بنر منتشرشده", value: banners === null ? null : publishedBanners, tone: "text-emerald-700" },
    { label: "محصول فعال", value: catalog === null ? null : activeProducts, tone: "text-primary" },
    { label: "محصول ناموجود", value: catalog === null ? null : outOfStock, tone: outOfStock > 0 ? "text-red-600" : "text-muted-foreground" },
    { label: "دستهٔ فعال", value: catalog === null ? null : activeCategories, tone: "text-foreground" },
  ];
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(stat => <div key={stat.label} className="rounded-xl border border-border bg-card px-4 py-3"><dt className="text-xs font-semibold text-muted-foreground">{stat.label}</dt><dd className={`mt-1 text-2xl font-bold tabular-nums ${stat.tone}`}>{stat.value === null ? "—" : stat.value.toLocaleString("fa-IR")}</dd></div>)}</dl>;
}

export function StoreBuilderPage() {
  const { authentication } = useDashboardSession();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannersLoading, setBannersLoading] = useState(true);

  const loadBanners = useCallback(() => listAdminBanners(authentication.accessToken)
    .then(next => { setBanners(next.items); setBannerError(null); })
    .catch(error => { setBannerError(bannerErrorMessage(error instanceof ContentBannerApiError ? error.status : 0)); throw error; })
    .finally(() => setBannersLoading(false)), [authentication.accessToken]);

  const refreshBanners = useCallback(async () => { setBannersLoading(true); await loadBanners(); }, [loadBanners]);

  const loadCatalog = useCallback(async () => { setState(await loadCommerceCatalog(apiClient, authentication.accessToken)); }, [authentication.accessToken]);

  useEffect(() => {
    let cancelled = false;
    void loadCommerceCatalog(apiClient, authentication.accessToken).then(next => { if (!cancelled) setState(next); });
    void loadBanners().catch(() => undefined);
    return () => { cancelled = true; };
  }, [authentication.accessToken, loadBanners]);

  const refreshAll = () => Promise.allSettled([loadCatalog(), refreshBanners()]);

  return <div className="catalog-workspace flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-7"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="text-xs font-semibold text-primary">فروشگاه</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal">استور بیلدر</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">ویترین فروشگاه را کنترل کنید: بنرها را بسازید و منتشر کنید و پیش‌نمایش محصولات را با تصویر، قیمت و موجودی ببینید.</p>
      </div>
      <button type="button" disabled={bannersLoading} onClick={() => void refreshAll()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />{bannersLoading ? "در حال دریافت…" : "بازخوانی"}</button>
    </header>

    <Summary catalog={state.status === "ready" ? state.data : null} banners={bannerError ? null : banners} />

    {state.status === "loading" ? <p role="status" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">در حال دریافت کاتالوگ…</p>
      : state.status === "ready" ? <StorefrontPreview catalog={state.data} banners={bannerError ? null : banners} />
      : <Notice state={state.status} onRetry={() => void loadCatalog()} />}

    <BannerManager banners={banners} loading={bannersLoading} error={bannerError} onRefresh={refreshBanners} />
  </div></div>;
}

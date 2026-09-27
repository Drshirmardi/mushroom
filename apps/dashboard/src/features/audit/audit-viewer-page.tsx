"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { AuditViewerApiError, getAuditEvents, type AuditViewerPage, type AuditViewerQuery } from "@/lib/audit-viewer-api";

const actions = ["", "READ", "CREATE", "UPDATE", "SIGN", "AMEND", "PUBLISH", "EXPORT"] as const;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function AuditViewerPage() {
  const { authentication } = useDashboardSession();
  const [data, setData] = useState<AuditViewerPage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [filters, setFilters] = useState<AuditViewerQuery>({ from: today(), to: today(), limit: 25 });

  const load = useCallback(async (query = filters) => {
    setState("loading");
    try { setData(await getAuditEvents(authentication.accessToken, query)); setState("ready"); }
    catch (error) { setState(error instanceof AuditViewerApiError && [401, 403].includes(error.status) ? "forbidden" : "error"); }
  }, [authentication.accessToken, filters]);

  useEffect(() => {
    let cancelled = false;
    void getAuditEvents(authentication.accessToken, filters).then((next) => {
      if (!cancelled) { setData(next); setState("ready"); }
    }).catch((error: unknown) => {
      if (!cancelled) setState(error instanceof AuditViewerApiError && [401, 403].includes(error.status) ? "forbidden" : "error");
    });
    return () => { cancelled = true; };
  }, [authentication.accessToken, filters]); // Initial page intentionally has no mock or synthetic fallback.

  if (state === "loading" && !data) return <div className="flex-1 p-7 text-sm text-muted-foreground" role="status">در حال دریافت رویدادهای ممیزی…</div>;
  if (!data) return <div className="flex-1 p-7"><div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"><ShieldAlert size={18} className="ml-2 inline" />{state === "forbidden" ? "دسترسی به ممیزی مجاز نیست." : "دریافت رویدادهای ممیزی ناموفق بود."}{state === "error" && <button onClick={() => void load()} className="mr-3 font-bold underline">تلاش دوباره</button>}</div></div>;

  const apply = () => void load({ ...filters, cursor: undefined });
  return <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-7">
    <div><h1 className="text-xl font-bold">نمایشگر ممیزی دسترسی بالینی</h1><p className="mt-1 text-sm text-muted-foreground">فقط رویدادهای دارای حوزهٔ کلینیک، با شناسه‌ها و metadata ماسک‌شده در {data.timeZone} نمایش داده می‌شوند. خروجی و دادهٔ خام ارائه نمی‌شود.</p></div>
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
      <label className="text-sm">از<input type="date" value={filters.from ?? ""} onChange={(event) => setFilters({ ...filters, from: event.target.value || undefined })} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <label className="text-sm">تا<input type="date" value={filters.to ?? ""} onChange={(event) => setFilters({ ...filters, to: event.target.value || undefined })} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <label className="text-sm">عمل<select value={filters.action ?? ""} onChange={(event) => setFilters({ ...filters, action: (event.target.value || undefined) as AuditViewerQuery["action"] })} className="mt-1 block w-full rounded-lg border p-2">{actions.map((action) => <option key={action} value={action}>{action || "همه"}</option>)}</select></label>
      <label className="text-sm">نوع منبع<input value={filters.subjectType ?? ""} maxLength={100} onChange={(event) => setFilters({ ...filters, subjectType: event.target.value || undefined })} className="mt-1 block w-full rounded-lg border p-2" placeholder="مثلاً ClinicalNote" /></label>
      <label className="text-sm md:col-span-3">شناسهٔ actor<input value={filters.actorId ?? ""} onChange={(event) => setFilters({ ...filters, actorId: event.target.value || undefined })} className="mt-1 block w-full rounded-lg border p-2" placeholder="UUID" /></label>
      <button onClick={apply} className="self-end rounded-lg border px-3 py-2 text-sm font-bold">اعمال فیلتر</button>
    </section>
    <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-secondary text-xs text-muted-foreground"><tr><th className="p-3">زمان</th><th className="p-3">عمل</th><th className="p-3">actor</th><th className="p-3">subject</th><th className="p-3">منبع</th><th className="p-3">correlation</th></tr></thead><tbody>{data.items.map((item: AuditViewerPage["items"][number]) => <tr key={item.id} className="border-t"><td className="p-3">{new Date(item.occurredAt).toLocaleString("fa-IR")}</td><td className="p-3">{item.action}</td><td className="p-3 font-mono text-xs">{item.actorReference ?? "—"}</td><td className="p-3 font-mono text-xs">{item.subjectReference}</td><td className="p-3">{item.subjectType}</td><td className="p-3 font-mono text-xs">{item.requestCorrelationReference ?? "—"}</td></tr>)}{data.items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">رویدادی در این بازه و حوزهٔ مجاز وجود ندارد.</td></tr>}</tbody></table></div>{data.nextCursor && <div className="border-t p-3"><button onClick={() => void load({ ...filters, cursor: data.nextCursor ?? undefined })} className="rounded-lg border px-3 py-2 text-sm font-bold">صفحهٔ بعدی</button></div>}</section>
    <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><RefreshCw size={15} />تازه‌سازی</button>
  </div>;
}

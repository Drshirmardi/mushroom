"use client";
import { useEffect, useState } from "react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { getAdminPatients } from "@/lib/patient-api";
import { listVisits } from "@/lib/visits-api";

export function PatientSelector({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const { authentication } = useDashboardSession();
  const physician = !authentication.user.roles.includes("ADMIN") && authentication.user.roles.includes("DOCTOR");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      setBusy(true); setError("");
      const request = physician
        ? listVisits(authentication.accessToken, true, { page }).then(data => ({ rows: data.items.map(item => ({ id: item.patientId, name: item.patientDisplayName || "بیمار بدون نام" })), total: data.total }))
        : getAdminPatients(authentication.accessToken, { query: query.trim() || undefined, page, pageSize: 20 }).then(data => ({ rows: data.items.map(item => ({ id: item.patientId, name: item.displayName || item.phone })), total: data.total }));
      void request.then(data => { if (live) { setRows([...new Map(data.rows.map(row => [row.id, row])).values()]); setTotal(data.total); } }, () => { if (live) setError("دریافت بیماران مجاز ممکن نشد؛ دسترسی و اتصال را بررسی کنید."); }).finally(() => { if (live) setBusy(false); });
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [authentication.accessToken, physician, page, query, attempt]);
  return <section className="rounded-2xl border border-border bg-card p-5 space-y-4"><div><h2 className="font-bold">انتخاب بیمار</h2><p className="mt-1 text-sm text-muted-foreground">{physician ? "بیماران نوبت‌های تخصیص‌یافته به شما" : "بیمار را با نام یا شماره موبایل پیدا کنید."}</p></div>
    {!physician && <label className="block text-sm">نام یا شماره موبایل<input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3" /></label>}
    {error && <p role="alert" className="text-sm text-destructive">{error}<button onClick={() => setAttempt(n => n + 1)} className="ms-2 underline">تلاش دوباره</button></p>}
    {busy ? <p role="status" className="text-sm text-muted-foreground">در حال دریافت بیماران…</p> : !error && <div className="grid gap-2 sm:grid-cols-2">{rows.map(row => <button type="button" key={row.id} onClick={() => onSelect(row.id, row.name)} className="min-h-11 rounded-xl border border-border px-4 py-3 text-start hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">{row.name}</button>)}{!rows.length && <p className="text-sm text-muted-foreground">بیماری پیدا نشد.</p>}</div>}
    <div className="flex items-center gap-3 text-sm"><button disabled={busy || page === 1} onClick={() => setPage(n => n - 1)} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-40">قبلی</button><span>صفحهٔ {page.toLocaleString("fa-IR")}</span><button disabled={busy || page * 20 >= total} onClick={() => setPage(n => n + 1)} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-40">بعدی</button></div>
  </section>;
}

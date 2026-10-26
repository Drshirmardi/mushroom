"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar, StatusBadge } from "@/components/shared";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { getAdminPatients, PatientApiError, type AdminPatientList } from "@/lib/patient-api";

function initial(name: unknown) {
  const value = typeof name === "string" ? name.trim() : "";
  return value ? value.slice(0, 1) : "ب";
}

function onboardingLabel(state: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE") {
  return state === "COMPLETE" ? "تکمیل" : state === "IN_PROGRESS" ? "در حال تکمیل" : "شروع نشده";
}

export function PatientsPage() {
  const router = useRouter();
  const { authentication } = useDashboardSession();
  const [search, setSearch] = useState("");
  const [serverQuery, setServerQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminPatientList["items"]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PatientApiError | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setServerQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void getAdminPatients(authentication.accessToken, { query: serverQuery || undefined, page, pageSize: 20 })
      .then((data) => {
        if (cancelled) return;
        setItems((current) => (page === 1 ? data.items : [...current, ...data.items]));
        setTotal(data.total);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof PatientApiError ? reason : new PatientApiError(0));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authentication.accessToken, serverQuery, page]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در بیماران با نام یا شماره موبایل..." className="w-full bg-card border border-border rounded-xl pr-8 pl-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
        {!loading ? <p className="text-xs text-muted-foreground">{total.toLocaleString("fa-IR")} بیمار</p> : null}
      </div>
      {loading && items.length === 0 && !error && <p className="text-sm text-muted-foreground">در حال دریافت فهرست بیماران…</p>}
      {error?.status === 401 || error?.status === 403 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">اجازهٔ مشاهدهٔ فهرست بیماران را ندارید.</p> : null}
      {error && error.status !== 401 && error.status !== 403 ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">دریافت فهرست بیماران ممکن نشد. صفحه را دوباره بارگذاری کنید.</p> : null}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(pt => (
          <div key={pt.patientId} onClick={() => router.push(`/patients/${pt.patientId}`)} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer hover:border-primary/30 group transition-all">
            <div className="flex items-center gap-4 mb-3"><Avatar letter={initial(pt.displayName)} size="md" /><div className="flex-1 min-w-0"><h3 className="font-bold group-hover:text-primary transition-colors">{String(pt.displayName ?? "بدون نام")}</h3><p className="text-xs text-muted-foreground">{pt.phone}</p></div><StatusBadge status={onboardingLabel(pt.onboardingState)} /></div>
            <p className="text-xs text-muted-foreground mb-3">وضعیت پرونده اولیه: {onboardingLabel(pt.onboardingState)}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3 mt-3">
              <span>سن: {pt.ageYears == null ? "ثبت نشده" : String(pt.ageYears)}</span><span className="mr-auto">وضعیت حساب: {pt.accountStatus === "ACTIVE" ? "فعال" : "غیرفعال"}</span>
            </div>
          </div>
        ))}
      </div>
      {loading && items.length > 0 && <p className="text-sm text-muted-foreground">در حال دریافت نتایج بیشتر…</p>}
      {!loading && items.length < total ? <button onClick={() => setPage(page + 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">نمایش بیشتر</button> : null}
      {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">بیماری با این مشخصات یافت نشد.</p>}
    </div>
  );
}

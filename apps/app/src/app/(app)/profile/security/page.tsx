"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { listAuthSessions, revokeAuthSession, logoutAllSessions } from "@/lib/security-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { patientErrorMessage } from "@/lib/patient-request";
import { loginUrl } from "@/lib/api";
const date = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export default function SecurityPage() {
  const router = useRouter(); const { authentication } = useAuthSession(); const token = authentication.accessToken;
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const resource = usePatientResource(useCallback(() => listAuthSessions(token, page), [token, page]));
  const revoke = async (id: string, current: boolean) => {
    if (busy || !window.confirm(current ? "از نشست فعلی خارج شوید؟" : "دسترسی این نشست قطع شود؟")) return; setBusy(true); setError(null);
    try { await revokeAuthSession(token, id); if (current) window.location.replace(loginUrl); else await resource.reload(); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  const logoutAll = async () => {
    if (busy || !window.confirm("از همهٔ نشست‌ها، شامل همین دستگاه، خارج شوید؟")) return; setBusy(true); setError(null);
    try { await logoutAllSessions(token); window.location.replace(loginUrl); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <div><PageHeader title="امنیت و نشست‌های فعال" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-6"><p className="text-sm leading-7 text-muted-foreground">نشست‌های ثبت‌شدهٔ حساب خودتان را بررسی کنید و دسترسی مواردی را که نمی‌شناسید قطع کنید.</p><PatientResourceState {...resource} retry={() => void resource.reload()} />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{resource.data?.items.map(item => <section key={item.id} className="space-y-2 rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-bold">{item.current ? "نشست فعلی" : "نشست دیگر"}</h2><p className="text-xs text-muted-foreground">آخرین استفاده: {date(item.lastUsedAt)}</p><p className="text-xs text-muted-foreground">شروع: {date(item.createdAt)}</p><p className="text-xs text-muted-foreground">پایان اعتبار: {date(item.expiresAt)}</p><button type="button" disabled={busy} onClick={() => void revoke(item.id, item.current)} className="mt-2 rounded-xl border border-red-100 p-3 text-sm text-red-700 disabled:opacity-40">قطع دسترسی این نشست</button></section>)}{resource.data?.items.length === 0 && <p className="text-sm text-muted-foreground">نشست فعالی در این صفحه ثبت نشده است.</p>}{resource.data && <PatientPagination page={page} total={resource.data.total} pageSize={20} onChange={setPage} />}<button type="button" disabled={busy} onClick={() => void logoutAll()} className="w-full rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700 disabled:opacity-40">خروج از همهٔ دستگاه‌ها</button></div></div>;
}

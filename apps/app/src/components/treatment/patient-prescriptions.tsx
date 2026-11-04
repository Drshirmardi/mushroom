"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { LoadingState } from "@/components/shared/skeletons";
import { useEffect, useRef, useState } from "react";
import type { components } from "@sabz-zendegi/api-client";
import { apiBaseUrl, sessionFetch } from "@/lib/api";
import { ServiceSection } from "@/components/shared/service-page";

type Prescription = components["schemas"]["PrescriptionResponseDto"];
type Page = { items: Prescription[]; nextCursor?: string | null };
export function PatientPrescriptions({ token }: { token: string }) {
  const [data, setData] = useState<Page | null>(null); const [error, setError] = useState("");
  const epoch = useRef(0);
  const [busy, setBusy] = useState(false); const [attempt, setAttempt] = useState(0);
  const request = async (cursor?: string | null): Promise<Page> => {
    const url = new URL("/v1/patients/me/prescriptions", apiBaseUrl); if (cursor) url.searchParams.set("cursor", cursor);
    const response = await sessionFetch(url, { cache: "no-store", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("PRESCRIPTIONS_UNAVAILABLE");
    return response.json();
  };
  useEffect(() => {
    let live = true; epoch.current++;
    void request().then(value => { if (live) { setData(value); setError(""); setBusy(false); } }, () => { if (live) { setError("دریافت نسخه‌های شما ممکن نشد. دوباره تلاش کنید."); setBusy(false); } });
    return () => { live = false; epoch.current++; };
  }, [token, attempt]);
  const older = async () => {
    if (!data?.nextCursor || busy) return; const generation = epoch.current; setBusy(true); setError("");
    try { const page = await request(data.nextCursor); if (epoch.current !== generation) return; setData(current => ({ items: [...new Map([...(current?.items ?? []), ...page.items].map(item => [item.id, item])).values()], nextCursor: page.nextCursor })); }
    catch { if (epoch.current === generation) setError("دریافت نسخه‌های قبلی ممکن نشد."); } finally { if (epoch.current === generation) setBusy(false); }
  };
  return <ServiceSection title="نسخه‌های صادرشدهٔ من" description="دستور مصرف ثبت‌شده توسط پزشک را اینجا می‌بینید.">
    {error && <p role="alert" className="service-note">{error}<button onClick={() => setAttempt(n => n + 1)} className="service-text-action">تلاش دوباره</button></p>}
    {!data && !error && <LoadingState label="در حال دریافت نسخه‌ها…" variant="list" />}
    {data?.items.length === 0 && <p className="service-note">هنوز نسخه‌ای برای شما صادر نشده است.</p>}
    {data?.items.map(record => <details key={record.id} className="service-card service-disclosure" open><summary>نسخهٔ صادرشده · {record.revision?.issuedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(record.revision.issuedAt)) : ""}</summary><div className="service-stack">{record.revision?.items.map(item => <article key={item.id} className="service-treatment-item"><h3>{item.medicationName}</h3><dl className="mt-2 grid gap-2 text-sm">{([["مقدار یا دوز", item.doseText], ["دفعات مصرف", item.frequencyText], ["مدت مصرف", item.durationText]] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="inline font-semibold">{label}: </dt><dd className="inline">{value}</dd></div>)}</dl>{item.instructions && <p className="mt-2 whitespace-pre-wrap break-words">{item.instructions}</p>}</article>)}</div></details>)}
    {data?.nextCursor && <button disabled={busy} onClick={() => void older()} className="service-text-action disabled:opacity-40" aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{"در حال دریافت…"}</> : "نسخه‌های قبلی"}</button>}
  </ServiceSection>;
}

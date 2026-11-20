"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { components } from "@sabz-zendegi/api-client";
import { CalendarDays, ChevronDown, Pill } from "lucide-react";
import { apiBaseUrl, sessionFetch } from "@/lib/api";
import { ServiceSection } from "@/components/shared/service-page";
import { LoadingState } from "@/components/shared/skeletons";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { toP } from "@/lib/format";

type Prescription = components["schemas"]["PrescriptionResponseDto"];
type Page = { items: Prescription[]; nextCursor?: string | null };

const issuedDate = (record: Prescription) => record.revision?.issuedAt ?? "";

export function PatientPrescriptions({ token }: { token: string }) {
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const epoch = useRef(0);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const request = async (cursor?: string | null): Promise<Page> => {
    const url = new URL("/v1/patients/me/prescriptions", apiBaseUrl);
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await sessionFetch(url, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("PRESCRIPTIONS_UNAVAILABLE");
    return response.json();
  };

  useEffect(() => {
    let live = true;
    epoch.current++;
    void request().then(
      (value) => {
        if (!live) return;
        setData(value);
        setError("");
        setBusy(false);
      },
      () => {
        if (!live) return;
        setError("دریافت نسخه‌های شما ممکن نشد. دوباره تلاش کنید.");
        setBusy(false);
      },
    );
    return () => {
      live = false;
      epoch.current++;
    };
  }, [token, attempt]);

  const records = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => Date.parse(issuedDate(b)) - Date.parse(issuedDate(a))),
    [data?.items],
  );

  const older = async () => {
    if (!data?.nextCursor || busy) return;
    const generation = epoch.current;
    setBusy(true);
    setError("");
    try {
      const page = await request(data.nextCursor);
      if (epoch.current !== generation) return;
      setData((current) => ({
        items: [...new Map([...(current?.items ?? []), ...page.items].map((item) => [item.id, item])).values()],
        nextCursor: page.nextCursor,
      }));
    } catch {
      if (epoch.current === generation) setError("دریافت نسخه‌های قبلی ممکن نشد.");
    } finally {
      if (epoch.current === generation) setBusy(false);
    }
  };

  return (
    <ServiceSection title="نسخه‌های صادرشده" description="آخرین نسخه در ابتداست؛ برای دیدن دستور هر دارو، نسخه را باز کنید.">
      {error && (
        <p role="alert" className="service-note">
          {error}
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="service-text-action">
            تلاش دوباره
          </button>
        </p>
      )}
      {!data && !error && <LoadingState label="در حال دریافت نسخه‌ها…" variant="list" />}
      {data?.items.length === 0 && <p className="service-note">هنوز نسخه‌ای برای شما صادر نشده است.</p>}

      {records.map((record, index) => {
        const items = record.revision?.items ?? [];
        const date = issuedDate(record)
          ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(issuedDate(record)))
          : "تاریخ ثبت نشده";
        const names = items.slice(0, 2).map((item) => item.medicationName).join("، ");
        return (
          <details key={record.id} className="service-card service-disclosure prescription-card" open={index === 0}>
            <summary>
              <span className="prescription-summary-icon" aria-hidden="true"><Pill size={19} /></span>
              <span className="prescription-summary-copy">
                <span className="prescription-summary-title">نسخهٔ صادرشده · {date}</span>
                <span className="prescription-summary-meta">
                  {items.length ? `${toP(items.length)} دارو${names ? ` · ${names}` : ""}` : "جزئیات دارو ثبت نشده"}
                  {items.length > 2 ? ` و ${toP(items.length - 2)} مورد دیگر` : ""}
                </span>
              </span>
              <ChevronDown className="prescription-summary-chevron" size={18} aria-hidden="true" />
            </summary>
            <div className="prescription-medicine-list">
              {items.length === 0 && <p className="service-note">جزئیات دارویی برای این نسخه ثبت نشده است.</p>}
              {items.map((item) => {
                const fields = [
                  ["مقدار یا دوز", item.doseText],
                  ["دفعات مصرف", item.frequencyText],
                  ["مدت مصرف", item.durationText],
                ].filter((entry): entry is [string, string] => Boolean(entry[1]));
                return (
                  <article key={item.id} className="prescription-medicine">
                    <h3>{item.medicationName}</h3>
                    {fields.length > 0 && (
                      <dl className="prescription-medicine-fields">
                        {fields.map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {item.instructions && <p className="prescription-instructions">{item.instructions}</p>}
                  </article>
                );
              })}
            </div>
          </details>
        );
      })}

      {data?.nextCursor && (
        <button type="button" disabled={busy} onClick={() => void older()} className="service-text-action disabled:opacity-40" aria-busy={busy}>
          {busy ? <><HeartbeatLoader />در حال دریافت…</> : <><CalendarDays size={16} aria-hidden="true" />نسخه‌های قدیمی‌تر</>}
        </button>
      )}
    </ServiceSection>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage, ServiceEmpty, ServiceSteps } from "@/components/shared/service-page";
import { availabilityDateRange } from "@/lib/availability";
import { directoryErrorMessage, getPatientAvailability } from "@/lib/directory-api";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

type Slot = components["schemas"]["PatientAvailabilityItemDto"];

function BookStep2() {
  const searchParams = useSearchParams();
  const navigateScreen = useScreenNavigation();
  const { authentication } = useAuthSession();
  const doctorId = searchParams.get("doctorId") ?? "";
  const doctorServiceId = searchParams.get("doctorServiceId") ?? "";
  const appointmentId = searchParams.get("appointmentId") ?? "";
  const [today] = useState(() => availabilityDateRange().fromDate);
  const [date, setDate] = useState(() => {
    const requested = searchParams.get("date") ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested >= today ? requested : today;
  });
  const [items, setItems] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const requestKey = useRef(0);

  useEffect(() => {
    const key = ++requestKey.current;
    setItems(null); setError(null); setSelected(null); setPage(1); setTotal(0); setMoreError(null); setLoadingMore(false);
    if (!doctorServiceId) {
      setError("برای مشاهدهٔ زمان‌ها ابتدا پزشک و خدمت را انتخاب کنید.");
      return () => { requestKey.current++; };
    }
    void getPatientAvailability(authentication.accessToken, doctorServiceId, date, date).then(
      (value) => { if (requestKey.current === key) { setItems(value.items); setTotal(value.total); } },
      (reason: unknown) => { if (requestKey.current === key) setError(directoryErrorMessage(reason)); },
    );
    return () => { requestKey.current++; };
  }, [authentication.accessToken, doctorServiceId, date]);

  const changeDate = (value: string) => {
    if (!value || value < today || value === date) return;
    requestKey.current++;
    setDate(value);
    setItems(null); setSelected(null); setMoreError(null);
  };

  const loadMore = async () => {
    if (loadingMore || !items || items.length >= total) return;
    const key = requestKey.current;
    setLoadingMore(true); setMoreError(null);
    try {
      const next = await getPatientAvailability(authentication.accessToken, doctorServiceId, date, date, page + 1);
      if (requestKey.current !== key) return;
      setItems((previous) => [...(previous ?? []), ...next.items]);
      setPage(next.page); setTotal(next.total);
    } catch (reason) {
      if (requestKey.current === key) setMoreError(directoryErrorMessage(reason));
    } finally {
      if (requestKey.current === key) setLoadingMore(false);
    }
  };

  const selectedDay = new Intl.DateTimeFormat("fa-IR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return <ServicePage title="انتخاب روز و ساعت" description="روز دلخواه را انتخاب کنید؛ ساعت‌های آزاد همان روز به وقت تهران از سرور دریافت می‌شوند." icon={CalendarDays} backHref={`/appointments/book?preselectedDoctor=${encodeURIComponent(doctorId)}`} backLabel="انتخاب پزشک">
    <ServiceSteps steps={["پزشک و خدمت", "روز و ساعت", "بررسی و پرداخت"]} current={1} />
    <div className="space-y-4">
      <label className="block rounded-2xl border border-border bg-white p-4 text-sm font-bold text-foreground">
        روز نوبت
        <input type="date" dir="ltr" min={today} value={date} onChange={(event) => changeDate(event.target.value)} className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-foreground" />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">{selectedDay} · به وقت تهران</span>
      </label>
      {!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت ساعت‌های آزاد این روز…</p>}
      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}
      {error && <Link href="/appointments/book" className="service-text-action">برگشت به انتخاب پزشک و خدمت</Link>}
      {items?.length === 0 && <ServiceEmpty title="برای این روز ساعت آزادی پیدا نشد" description="روز دیگری را انتخاب کنید یا بعداً ساعت‌های آزاد را دوباره بررسی کنید." />}
      {items && items.length > 0 && <fieldset>
        <legend className="mb-3 text-sm font-bold text-foreground">ساعت‌های آزاد {selectedDay}</legend>
        <div className="grid grid-cols-3 gap-2">{items.map((slot) => <button type="button" key={slot.startsAt} aria-pressed={selected?.startsAt === slot.startsAt} onClick={() => setSelected(slot)} className={`rounded-xl border py-3 text-sm font-bold transition-all ${selected?.startsAt === slot.startsAt ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground shadow-sm"}`}>{toP(slot.localStartTime)}</button>)}</div>
      </fieldset>}
      {items && items.length < total && <button type="button" className="service-text-action" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "در حال دریافت…" : "نمایش ساعت‌های بیشتر"}</button>}
      {moreError && <p role="alert" className="text-sm text-red-700">{moreError}</p>}
      <button type="button" disabled={!selected || !doctorId || !doctorServiceId} onClick={() => selected && navigateScreen("BookStep3", { doctorId, doctorServiceId, appointmentId, date: selected.localDate, time: selected.localStartTime, startsAt: selected.startsAt })} className={`w-full rounded-2xl py-4 text-sm font-bold transition-all ${selected && doctorId && doctorServiceId ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted text-muted-foreground"}`}>{appointmentId ? "بررسی تغییر زمان" : "بررسی نوبت و هزینه"}</button>
    </div>
  </ServicePage>;
}

export default function BookStep2Page() { return <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">در حال دریافت ساعت‌های آزاد…</p>}><BookStep2 /></Suspense>; }

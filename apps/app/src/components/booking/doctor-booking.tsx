"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { ShellAction } from "@/components/layout/shell-slots";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { availabilityDateRange, bookingDays } from "@/lib/availability";
import { getPatientAvailability, type PatientDoctorDetail, type PatientAvailability } from "@/lib/directory-api";
import { toP } from "@/lib/format";
import { finishOperation, useOperationKey } from "@/lib/use-operation-key";
import { usePatientResource } from "@/lib/use-patient-resource";
import { createAppointmentIntent, WalletRequestError, walletErrorMessage } from "@/lib/wallet-billing-api";
import { formatRialWithUnit } from "@/lib/wallet-money";
import { BookingCalendar } from './booking-calendar';
import styles from "./booking.module.css";

type Offering = PatientDoctorDetail["offerings"][number];
type Slot = PatientAvailability["items"][number];
const weekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "short", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", timeZone: "UTC" });
const month = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long", year: "numeric", timeZone: "UTC" });
const civilDate = (date: string) => new Date(`${date}T12:00:00Z`);
const visitMode = (offering: Offering) => offering.visitMode === "IN_PERSON" ? "حضوری" : "آنلاین";
const amount = (offering: Offering) => offering.priceAmount === 0 ? "رایگان" : formatRialWithUnit(BigInt(offering.priceAmount));

async function loadWeek(token: string, offeringId: string, days: string[]) {
  const first = await getPatientAvailability(token, offeringId, days[0], days[6]);
  const items = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / first.pageSize); page++) {
    const next = await getPatientAvailability(token, offeringId, days[0], days[6], page);
    items.push(...next.items);
  }
  return { ...first, items: [...new Map(items.map(slot => [slot.startsAt, slot])).values()] };
}

function BookingWeek({ doctor, offering, token, start, onWeek, today, preferredDay, userId }: {
  doctor: PatientDoctorDetail; offering: Offering; token: string; start: string;
  userId: string; onWeek: (start: string, preferredDay?: string) => void; today: string; preferredDay?: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState(preferredDay ?? "");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [calendar, setCalendar] = useState(false);
  const inFlight = useRef(false);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const operationKey = useOperationKey("patient-appointment");
  const resource = usePatientResource(useCallback(() => loadWeek(token, offering.id, bookingDays(start)), [token, offering.id, start]));
  const days = bookingDays(start);
  const previousWeek = bookingDays(start, -7)[0];
  const available = resource.data?.items ?? [];
  const selectedDay = day || available[0]?.localDate || start;
  const selectedSlot = available.find(item => item.startsAt === slot?.startsAt);
  const dateLabel = selectedSlot ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "full", timeStyle: "short", hourCycle: "h23", timeZone: doctor.clinic.timeZone,
  }).format(new Date(selectedSlot.startsAt)) : "";

  async function confirm() {
    if (!selectedSlot || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const payload = { doctorServiceId: offering.id, startsAt: selectedSlot.startsAt };
    const identifiers = [userId, offering.id, payload.startsAt];
    try {
      const intent = await createAppointmentIntent(token, payload, await operationKey(identifiers));
      await finishOperation("patient-appointment", identifiers);
      if (intent.status === "PAID" && intent.appointmentId) {
        router.replace(`/appointments/book/success?appointmentId=${encodeURIComponent(intent.appointmentId)}`);
      } else {
        router.push(`/appointments/book/pay?intentId=${encodeURIComponent(intent.id)}`);
      }
    } catch (reason) {
      if (reason instanceof WalletRequestError && ["APPOINTMENT_SLOT_CONFLICT", "APPOINTMENT_SLOT_UNAVAILABLE"].includes(reason.code ?? "")) {
        setReviewing(false);
        setSlot(null);
        setError("این ساعت دیگر آزاد نیست. لطفاً ساعت دیگری انتخاب کنید.");
        void resource.reload();
      } else {
        setError(reason instanceof WalletRequestError && reason.code === "BOOKING_INELIGIBLE"
          ? "شرایط رزرو تغییر کرده است. برای بررسی پرونده و ارزیابی به فهرست رزرو برگردید."
          : walletErrorMessage(reason));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section className={styles.section} aria-labelledby="booking-time">
    <h2 id="booking-time">انتخاب روز و ساعت</h2>
    <div className={styles.weekControls}>
      <button type="button" aria-label="هفتهٔ قبل" disabled={start <= today} onClick={() => onWeek(previousWeek < today ? today : previousWeek)}><ArrowRight size={17} /></button>
      <button type="button" aria-label={`تقویم شمسی، ${month.format(civilDate(selectedDay))}`} aria-expanded={calendar} onClick={() => setCalendar(current => !current)}><span className="flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" />{month.format(civilDate(selectedDay))}</span></button>
      <button type="button" aria-label="هفتهٔ بعد" onClick={() => onWeek(bookingDays(start, 7)[0])}><ArrowLeft size={17} /></button>
    </div>
    {calendar && <BookingCalendar selected={selectedDay} today={today} onSelect={next => {
      setCalendar(false);
      if (days.includes(next)) { setDay(next); setSlot(null); setError(""); }
      else onWeek(next, next);
    }} />}
    <div className={styles.days} role="group" aria-label="روز نوبت">
      {days.map(date => <button type="button" key={date} aria-pressed={selectedDay === date} aria-label={new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeZone: "UTC" }).format(civilDate(date))} onClick={() => { setDay(date); setSlot(null); setError(""); }}>
        <span>{weekday.format(civilDate(date))}</span><strong>{dayNumber.format(civilDate(date))}</strong>
      </button>)}
    </div>
    <PatientResourceState {...resource} retry={() => void resource.reload()} />
    {resource.data && <>
      <p className="text-xs text-muted-foreground">ساعت‌ها به وقت کلینیک هستند.</p>
      {available.length ? <>
        <div className={styles.slots} role="group" aria-label="ساعت‌های آزاد">
          {available.filter(item => item.localDate === selectedDay).map(item => <button type="button" aria-pressed={selectedSlot?.startsAt === item.startsAt} key={item.startsAt} onClick={() => { setSlot(item); setError(""); }}>{toP(item.localStartTime)}</button>)}
        </div>
        {!available.some(item => item.localDate === selectedDay) && <p role="status">این روز زمان آزادی نیست.</p>}
      </> : <div><p role="status">این هفته زمان آزادی نیست.</p><button className="service-text-action" type="button" onClick={() => onWeek(bookingDays(start, 7)[0])}>هفتهٔ بعد</button></div>}
    </>}
    {error && !reviewing && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ShellAction><div className={styles.action}><button ref={reviewButton} type="button" className="service-primary w-full" disabled={!selectedSlot || resource.loading || resource.refreshing || busy} onClick={() => { setError(""); setReviewing(true); }}>بررسی نوبت</button></div></ShellAction>
    {reviewing && selectedSlot && <BottomSheet title="بررسی نوبت" finalFocus={reviewButton} onClose={() => { setReviewing(false); setError(""); }} dismissible={!busy} onBeforeClose={() => !inFlight.current}
      footer={<button type="button" className="service-primary w-full" disabled={busy} aria-busy={busy} onClick={() => void confirm()}>{busy ? "در حال ثبت…" : offering.priceAmount === 0 ? "تأیید و ثبت نوبت" : "تأیید و ادامه به پرداخت"}</button>}>
      <dl className={styles.summary} dir="rtl">
        {[["پزشک", doctor.displayName], ["خدمت", offering.service.name], ["نوع ویزیت", visitMode(offering)], ["مدت", `${toP(offering.durationMinutes)} دقیقه`], ["تاریخ و ساعت", dateLabel], ["هزینهٔ اعلام‌شده", amount(offering)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {offering.priceAmount > 0 && <p className="text-sm text-muted-foreground">مبلغ قطعی پیش از پرداخت نمایش داده می‌شود.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </BottomSheet>}
  </section>;
}

export function DoctorBooking({ doctor, token, userId }: { doctor: PatientDoctorDetail; token: string; userId: string }) {
  const [offeringId, setOfferingId] = useState(doctor.offerings.length === 1 ? doctor.offerings[0].id : "");
  const [today] = useState(() => availabilityDateRange(new Date(), 7, doctor.clinic.timeZone).fromDate);
  const [week, setWeek] = useState<{ start: string; day?: string }>({ start: today });
  const offering = doctor.offerings.find(item => item.id === offeringId);
  return <>
    <fieldset className={styles.section}>
      <legend className="mb-2">انتخاب خدمت</legend>
      {doctor.offerings.map(item => <label key={item.id} className={`service-offering ${offeringId === item.id ? "service-offering--selected" : ""}`}>
        <span className="flex items-start gap-2"><input className="mt-1 accent-primary" type="radio" name="doctor-offering" checked={offeringId === item.id} onChange={() => { setOfferingId(item.id); setWeek({ start: today }); }} />
        <span><strong>{item.service.name}</strong><span className="block text-sm text-muted-foreground">{visitMode(item)} · {toP(item.durationMinutes)} دقیقه</span><span className="block font-bold">{amount(item)}</span></span></span>
      </label>)}
    </fieldset>
    {doctor.offerings.length > 0 && !offering && <ShellAction><div className={styles.action}><button type="button" className="service-primary w-full" disabled>بررسی نوبت</button></div></ShellAction>}
    {offering && <BookingWeek key={`${offering.id}:${week.start}:${week.day ?? ""}`} doctor={doctor} offering={offering} token={token} userId={userId} today={today} start={week.start} preferredDay={week.day} onWeek={(start, day) => setWeek({ start, day })} />}
  </>;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { ShellAction } from '@/components/layout/shell-slots';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { availabilityDateRange, bookingDays } from '@/lib/availability';
import {
  getPatientAvailability,
  type PatientDoctorDetail,
  type PatientAvailability,
} from '@/lib/directory-api';
import { toP } from '@/lib/format';
import { finishOperation, useOperationKey } from '@/lib/use-operation-key';
import { usePatientResource } from '@/lib/use-patient-resource';
import {
  createAppointmentIntent,
  WalletRequestError,
  walletErrorMessage,
} from '@/lib/wallet-billing-api';
import { formatRialWithUnit } from '@/lib/wallet-money';
import { BookingCalendar } from './booking-calendar';
import styles from './booking.module.css';

type Offering = PatientDoctorDetail['offerings'][number];
type Slot = PatientAvailability['items'][number];
const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  weekday: 'short',
  timeZone: 'UTC',
});
const dayNumber = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  day: 'numeric',
  timeZone: 'UTC',
});
const month = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  month: 'long',
  timeZone: 'UTC',
});
const civilDate = (date: string) => new Date(`${date}T12:00:00Z`);
const visitMode = (offering: Offering) => (offering.visitMode === 'IN_PERSON' ? 'حضوری' : 'آنلاین');
const amount = (offering: Offering) =>
  offering.priceAmount === 0 ? 'رایگان' : formatRialWithUnit(BigInt(offering.priceAmount));
const reviewButtonClass =
  'mx-auto my-2 block h-12 w-[calc(100%-1.5rem)] max-w-[550px] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition enabled:hover:bg-primary/90 enabled:active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-[#6b7280] disabled:text-white disabled:shadow-none disabled:opacity-100 sm:h-14 sm:text-base';
const tickHeights = [
  [32, 42, 62, 32, 42, 42, 98, 22, 26, 22, 30, 55],
  [30, 30, 42, 42, 42, 42, 98, 42, 42, 42, 42, 98],
  [42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 85],
  [55, 55, 55, 100, 30, 26, 26, 70, 42, 42, 42, 98],
];

async function loadAvailabilityRange(token: string, offeringId: string, days: string[]) {
  const fromDate = days[0];
  const toDate = days[days.length - 1];
  if (!fromDate || !toDate) throw new Error('Availability range is empty.');
  const first = await getPatientAvailability(token, offeringId, fromDate, toDate);
  const items = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / first.pageSize); page++) {
    const next = await getPatientAvailability(token, offeringId, fromDate, toDate, page);
    items.push(...next.items);
  }
  return { ...first, items: [...new Map(items.map((slot) => [slot.startsAt, slot])).values()] };
}

function BookingDateRange({
  doctor,
  offering,
  token,
  start,
  onRange,
  today,
  preferredDay,
  userId,
}: {
  doctor: PatientDoctorDetail;
  offering: Offering;
  token: string;
  start: string;
  userId: string;
  onRange: (start: string, preferredDay?: string) => void;
  today: string;
  preferredDay?: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState(preferredDay ?? '');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [calendar, setCalendar] = useState(false);
  const inFlight = useRef(false);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const calendarButton = useRef<HTMLButtonElement>(null);
  const dayStrip = useRef<HTMLDivElement>(null);
  const operationKey = useOperationKey('patient-appointment');
  const resource = usePatientResource(
    useCallback(
      () => loadAvailabilityRange(token, offering.id, bookingDays(start, 0, 14)),
      [token, offering.id, start],
    ),
  );
  const days = bookingDays(start, 0, 14);
  const available = resource.data?.items ?? [];
  const selectedDay = day || available[0]?.localDate || start;
  const selectedSlot = available.find((item) => item.startsAt === slot?.startsAt);
  useEffect(() => {
    const strip = dayStrip.current;
    const active = strip?.querySelector('button[aria-pressed="true"]');
    if (!strip || !active) return;
    const viewport = strip.getBoundingClientRect();
    const card = active.getBoundingClientRect();
    if (card.left < viewport.left) strip.scrollBy({ left: card.left - viewport.left });
    else if (card.right > viewport.right) strip.scrollBy({ left: card.right - viewport.right });
  }, [selectedDay]);
  const dateLabel = selectedSlot
    ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        dateStyle: 'full',
        timeStyle: 'short',
        hourCycle: 'h23',
        timeZone: doctor.clinic.timeZone,
      }).format(new Date(selectedSlot.startsAt))
    : '';

  async function confirm() {
    if (!selectedSlot || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    const payload = { doctorServiceId: offering.id, startsAt: selectedSlot.startsAt };
    const identifiers = [userId, offering.id, payload.startsAt];
    try {
      const intent = await createAppointmentIntent(token, payload, await operationKey(identifiers));
      await finishOperation('patient-appointment', identifiers);
      if (intent.status === 'PAID' && intent.appointmentId) {
        router.replace(
          `/appointments/book/success?appointmentId=${encodeURIComponent(intent.appointmentId)}`,
        );
      } else {
        router.push(`/appointments/book/pay?intentId=${encodeURIComponent(intent.id)}`);
      }
    } catch (reason) {
      if (
        reason instanceof WalletRequestError &&
        ['APPOINTMENT_SLOT_CONFLICT', 'APPOINTMENT_SLOT_UNAVAILABLE'].includes(reason.code ?? '')
      ) {
        setReviewing(false);
        setSlot(null);
        setError('این ساعت دیگر آزاد نیست. لطفاً ساعت دیگری انتخاب کنید.');
        void resource.reload();
      } else {
        setError(
          reason instanceof WalletRequestError && reason.code === 'BOOKING_INELIGIBLE'
            ? 'شرایط رزرو تغییر کرده است. برای بررسی پرونده و ارزیابی به فهرست رزرو برگردید.'
            : walletErrorMessage(reason),
        );
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="booking-time">
      <div className={`${styles.weekControls} ${styles.dateHeading}`}>
        <h2 id="booking-time">انتخاب تاریخ</h2>
        <div className={styles.dateControls}>
          <button
            ref={calendarButton}
            type="button"
            aria-haspopup="dialog"
            aria-label={`تقویم شمسی، ${month.format(civilDate(selectedDay))}`}
            aria-expanded={calendar}
            onClick={() => setCalendar((current) => !current)}
          >
            <span className="flex items-center gap-2">
              <CalendarDays size={16} aria-hidden="true" />
              {month.format(civilDate(selectedDay))}
            </span>
          </button>
        </div>
      </div>
      {calendar && (
        <BottomSheet
          title="انتخاب تاریخ"
          finalFocus={calendarButton}
          onClose={() => setCalendar(false)}
        >
          <BookingCalendar
            selected={selectedDay}
            today={today}
            onSelect={(next) => {
              setCalendar(false);
              if (days.includes(next)) {
                setDay(next);
                setSlot(null);
                setError('');
              } else onRange(next, next);
            }}
          />
        </BottomSheet>
      )}
      <div
        ref={dayStrip}
        className="scrollbar-hide grid min-w-0 snap-x auto-cols-[calc((100%_-_1.5rem)/4)] grid-flow-col gap-2 overflow-x-auto px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        role="group"
        aria-label="روزهای نوبت، ۱۴ روز آینده"
        tabIndex={0}
        onWheel={(event) => {
          const strip = event.currentTarget;
          if (strip.scrollWidth <= strip.clientWidth) return;
          const direction = getComputedStyle(strip).direction === 'rtl' ? -1 : 1;
          const delta = event.deltaX || event.deltaY * direction;
          if (!delta) return;
          const before = strip.scrollLeft;
          strip.scrollLeft += delta;
          if (strip.scrollLeft !== before) event.preventDefault();
        }}
      >
        {days.map((date) => (
          <button
            type="button"
            className="flex min-h-14 min-w-0 snap-start flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card px-1 py-1.5 text-xs transition-colors hover:border-primary aria-pressed:border-transparent aria-pressed:bg-secondary aria-pressed:text-primary sm:min-h-16"
            key={date}
            aria-pressed={selectedDay === date}
            aria-label={new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
              dateStyle: 'full',
              timeZone: 'UTC',
            }).format(civilDate(date))}
            onClick={() => {
              setDay(date);
              setSlot(null);
              setError('');
            }}
          >
            <strong className="text-base leading-5">{dayNumber.format(civilDate(date))}</strong>
            <span>{weekday.format(civilDate(date))}</span>
          </button>
        ))}
      </div>
      <PatientResourceState {...resource} retry={() => void resource.reload()} />
      {resource.data && (
        <>
          {available.length ? (
            <>
              {available.some((item) => item.localDate === selectedDay) && (
                <>
                  <h3 className="mt-1 text-sm font-semibold">انتخاب ساعت</h3>
                  <div
                    className="scrollbar-hide grid min-w-0 snap-x auto-cols-[calc((100%_-_1.5rem)/4)] grid-flow-col gap-x-1.5 overflow-x-auto px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-x-2"
                    role="group"
                    aria-label="ساعت‌های آزاد"
                    tabIndex={0}
                    onWheel={(event) => {
                      const strip = event.currentTarget;
                      if (strip.scrollWidth <= strip.clientWidth) return;
                      const direction = getComputedStyle(strip).direction === 'rtl' ? -1 : 1;
                      const delta = event.deltaX || event.deltaY * direction;
                      if (!delta) return;
                      const before = strip.scrollLeft;
                      strip.scrollLeft += delta;
                      if (strip.scrollLeft !== before) event.preventDefault();
                    }}
                  >
                    {available
                      .filter((item) => item.localDate === selectedDay)
                      .map((item, index) => (
                        <button
                          type="button"
                          className="group flex min-w-0 snap-start flex-col items-stretch rounded-lg px-0.5 pb-1 text-center text-sm tabular-nums aria-pressed:font-medium aria-pressed:text-primary"
                          aria-pressed={selectedSlot?.startsAt === item.startsAt}
                          key={item.startsAt}
                          onClick={() => {
                            setSlot(item);
                            setError('');
                          }}
                        >
                          <span
                            className="mx-0.5 mb-1.5 h-2 rounded-full bg-secondary opacity-0 transition-opacity group-hover:opacity-50 group-aria-pressed:opacity-100"
                            aria-hidden="true"
                          />
                          <span
                            dir="ltr"
                            className="flex h-7 items-end justify-between sm:h-9"
                            aria-hidden="true"
                          >
                            {tickHeights[index % tickHeights.length].map((height, tick) => (
                              <span
                                key={tick}
                                style={{ height: `${height}%` }}
                                className="w-0.5 rounded-full bg-muted-foreground transition-colors group-aria-pressed:bg-primary sm:w-[3px]"
                              />
                            ))}
                          </span>
                          <span dir="ltr" className="mt-2">
                            {toP(item.localStartTime)}
                          </span>
                        </button>
                      ))}
                  </div>
                </>
              )}
              {!available.some((item) => item.localDate === selectedDay) && (
                <p className="text-sm text-red-700" role="status">این روز زمان آزادی نیست.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-red-700" role="status">در ۱۴ روز آینده زمانی برای رزرو موجود نیست.</p>
          )}
        </>
      )}
      {error && !reviewing && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <ShellAction>
        <button
          ref={reviewButton}
          type="button"
          className={reviewButtonClass}
          disabled={!selectedSlot || resource.loading || resource.refreshing || busy}
          onClick={() => {
            setError('');
            setReviewing(true);
          }}
        >
          بررسی نوبت
        </button>
      </ShellAction>
      {reviewing && selectedSlot && (
        <BottomSheet
          title="بررسی نوبت"
          finalFocus={reviewButton}
          onClose={() => {
            setReviewing(false);
            setError('');
          }}
          dismissible={!busy}
          onBeforeClose={() => !inFlight.current}
          footer={
            <button
              type="button"
              className="service-primary w-full"
              disabled={busy}
              aria-busy={busy}
              onClick={() => void confirm()}
            >
              {busy
                ? 'در حال ثبت…'
                : offering.priceAmount === 0
                  ? 'تأیید و ثبت نوبت'
                  : 'تأیید و ادامه به پرداخت'}
            </button>
          }
        >
          <dl className={styles.summary} dir="rtl">
            {[
              ['پزشک', doctor.displayName],
              ['خدمت', offering.service.name],
              ['نوع ویزیت', visitMode(offering)],
              ['مدت', `${toP(offering.durationMinutes)} دقیقه`],
              ['تاریخ و ساعت', dateLabel],
              ['هزینهٔ اعلام‌شده', amount(offering)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {offering.priceAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              مبلغ قطعی پیش از پرداخت نمایش داده می‌شود.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </BottomSheet>
      )}
    </section>
  );
}

export function DoctorBooking({
  doctor,
  token,
  userId,
}: {
  doctor: PatientDoctorDetail;
  token: string;
  userId: string;
}) {
  const [offeringId, setOfferingId] = useState(
    doctor.offerings.length === 1 ? doctor.offerings[0].id : '',
  );
  const [today] = useState(
    () => availabilityDateRange(new Date(), 14, doctor.clinic.timeZone).fromDate,
  );
  const [dateRange, setDateRange] = useState<{ start: string; day?: string }>({ start: today });
  const offering = doctor.offerings.find((item) => item.id === offeringId);
  return (
    <>
      {doctor.offerings.length > 1 && (
        <fieldset className={styles.section}>
          <legend className="mb-2">انتخاب خدمت</legend>
          {doctor.offerings.map((item) => (
            <label
              key={item.id}
              className={`service-offering ${offeringId === item.id ? 'service-offering--selected' : ''}`}
            >
              <span className="flex items-start gap-2">
                <input
                  className="mt-1 accent-primary"
                  type="radio"
                  name="doctor-offering"
                  checked={offeringId === item.id}
                  onChange={() => {
                    setOfferingId(item.id);
                    setDateRange({ start: today });
                  }}
                />
                <span className="min-w-0 wrap-anywhere">
                  <strong>{item.service.name}</strong>
                  <span className="block text-sm text-muted-foreground">
                    {visitMode(item)} · {toP(item.durationMinutes)} دقیقه
                  </span>
                  <span className="block font-bold">{amount(item)}</span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!doctor.offerings.length && (
        <p role="status" className="text-sm text-muted-foreground">
          خدمت قابل رزروی ثبت نشده است.
        </p>
      )}
      {doctor.offerings.length > 0 && !offering && (
        <ShellAction>
          <button type="button" className={reviewButtonClass} disabled>
            بررسی نوبت
          </button>
        </ShellAction>
      )}
      {offering && (
        <BookingDateRange
          key={`${offering.id}:${dateRange.start}:${dateRange.day ?? ''}`}
          doctor={doctor}
          offering={offering}
          token={token}
          userId={userId}
          today={today}
          start={dateRange.start}
          preferredDay={dateRange.day}
          onRange={(start, day) => setDateRange({ start, day })}
        />
      )}
    </>
  );
}

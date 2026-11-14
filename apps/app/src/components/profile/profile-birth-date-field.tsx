'use client';

import { useEffect, useRef, useState } from 'react';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { toP } from '@/lib/format';
import { persianBirthDate, persianDateParts } from '@/lib/persian-birth-date';

const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
type Step = 'year' | 'month' | 'day';

function partsOf(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return persianDateParts(date);
}

function monthLength(year: number, month: number) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return persianBirthDate(year, month, 30) ? 30 : 29;
}

function prettyDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function ProfileBirthDateField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const currentYear = persianDateParts(new Date()).year;
  const minYear = currentYear - 130;
  const currentDate = new Date().toISOString().slice(0, 10);
  const initial = partsOf(value) ?? { year: currentYear, month: persianDateParts(new Date()).month, day: 1 };
  const [step, setStep] = useState<Step>(value ? 'day' : 'year');
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hasSelectedDay, setHasSelectedDay] = useState(Boolean(value));
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step !== 'year') return;
    const frame = requestAnimationFrame(() =>
      selectedYearRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const validDate = persianBirthDate(year, month, day);
  const canConfirm = Boolean(hasSelectedDay && validDate && validDate <= currentDate);
  const monthStart = persianBirthDate(year, month, 1);
  const weekdayOffset = monthStart
    ? (new Date(`${monthStart}T00:00:00.000Z`).getUTCDay() + 1) % 7
    : 0;
  const days = Array.from({ length: monthLength(year, month) }, (_, index) => index + 1);
  const calendarCells = [...Array.from({ length: weekdayOffset }, () => null), ...days];
  const chooseMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setDay((current) => Math.min(current, monthLength(year, nextMonth)));
    setStep('day');
  };

  return (
    <div>
      <p id="profile-birth-date-label" className="mb-1 text-xs font-bold text-muted-foreground">تاریخ تولد <span className="font-medium">(شمسی)</span></p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const current = partsOf(value);
          const next = current ?? { year: currentYear, month: persianDateParts(new Date()).month, day: 1 };
          setYear(next.year);
          setMonth(next.month);
          setDay(next.day);
          setHasSelectedDay(Boolean(current));
          setStep(current ? 'day' : 'year');
          setOpen(true);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 text-right transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={value ? `تغییر تاریخ تولد، ${prettyDate(value)}` : 'انتخاب تاریخ تولد'}
        aria-describedby="profile-birth-date-label"
      >
        <span className={value ? 'truncate text-sm text-foreground' : 'text-sm text-muted-foreground'}>
          {value ? prettyDate(value) : 'انتخاب تاریخ تولد'}
        </span>
        <span className="shrink-0 text-sm font-bold text-blue-700">{value ? 'تغییر' : 'انتخاب'}</span>
      </button>

      {open && (
        <BottomSheet
          title="انتخاب تاریخ تولد"
          ariaLabel="انتخاب تاریخ تولد شمسی"
          size="large"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50"
              >
                بستن
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => {
                  if (!validDate || validDate > currentDate) return;
                  onChange(validDate);
                  setOpen(false);
                }}
                className="min-h-11 flex-1 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                ثبت تاریخ
              </button>
            </div>
          }
        >
          <div className="space-y-4 pb-1">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-[11px] font-medium text-muted-foreground">تاریخ انتخاب‌شده</p>
              <p className="mt-1 text-base font-bold text-foreground" aria-live="polite">
                {canConfirm && validDate ? prettyDate(validDate) : 'سال، ماه و روز را انتخاب کنید'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
              {([
                ['year', 'سال'],
                ['month', 'ماه'],
                ['day', 'روز'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={key !== 'year' && !year}
                  onClick={() => setStep(key)}
                  aria-current={step === key ? 'step' : undefined}
                  className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors ${step === key ? 'bg-white text-blue-700 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                  <span className="ms-1 text-[11px] font-medium">
                    {key === 'year' ? toP(year) : key === 'month' ? MONTHS[month - 1] : toP(day)}
                  </span>
                </button>
              ))}
            </div>

            {step === 'year' && (
              <div
                className="max-h-[min(42dvh,22rem)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 p-2 [scrollbar-width:thin]"
                aria-label="سال تولد"
              >
                {Array.from({ length: currentYear - minYear + 1 }, (_, index) => currentYear - index).map((option) => (
                  <button
                    key={option}
                    ref={option === year ? selectedYearRef : undefined}
                    type="button"
                    aria-pressed={year === option}
                    onClick={() => {
                      setYear(option);
                      setDay((current) => Math.min(current, monthLength(option, month)));
                      setHasSelectedDay(false);
                      setStep('month');
                    }}
                    className={`mb-1 flex min-h-11 w-full items-center justify-center rounded-lg text-sm transition-colors last:mb-0 ${year === option ? 'bg-blue-700 font-bold text-white' : 'text-foreground hover:bg-blue-50'}`}
                  >
                    {toP(option)}
                  </button>
                ))}
              </div>
            )}

            {step === 'month' && (
              <div className="grid grid-cols-3 gap-2" aria-label="ماه تولد">
                {MONTHS.map((label, index) => {
                  const option = index + 1;
                  const unavailable = year === currentYear && option > persianDateParts(new Date()).month;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={unavailable}
                      aria-pressed={month === option}
                      onClick={() => {
                        setHasSelectedDay(false);
                        chooseMonth(option);
                      }}
                      className={`min-h-11 rounded-xl border px-2 text-xs font-semibold transition-colors ${month === option ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-foreground hover:border-blue-300 hover:bg-blue-50'} disabled:cursor-not-allowed disabled:opacity-35`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 'day' && (
              <div aria-label={`${MONTHS[month - 1]} ${toP(year)}`}>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
                  {WEEKDAYS.map((name, index) => <span key={`${name}-${index}`} className="py-2">{name}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((option, index) => {
                    if (option === null) return <span key={`empty-${index}`} aria-hidden="true" />;
                    const optionDate = persianBirthDate(year, month, option);
                    const unavailable = !optionDate || optionDate > currentDate;
                    const active = day === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={unavailable}
                        aria-pressed={active}
                        onClick={() => {
                          setDay(option);
                          setHasSelectedDay(true);
                        }}
                        className={`aspect-square min-h-11 rounded-full text-sm transition-colors ${active ? 'bg-blue-700 font-bold text-white' : 'text-foreground hover:bg-blue-50'} disabled:cursor-not-allowed disabled:text-slate-300`}
                      >
                        {toP(option)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { bookingDays } from "@/lib/availability";
import { persianDateParts } from "@/lib/persian-birth-date";
import { toP } from "@/lib/format";
import styles from "./booking.module.css";

const dateAtNoon = (day: string) => new Date(`${day}T12:00:00Z`);
const title = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long", year: "numeric", timeZone: "UTC" });
const full = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeZone: "UTC" });

function shift(day: string, offset: number) {
  return bookingDays(day, offset)[0];
}

function firstOfMonth(day: string) {
  return shift(day, 1 - persianDateParts(dateAtNoon(day)).day);
}

export function BookingCalendar({ selected, today, onSelect }: { selected: string; today: string; onSelect: (day: string) => void }) {
  const [start, setStart] = useState(() => firstOfMonth(selected));
  const month = persianDateParts(dateAtNoon(start)).month;
  const days = Array.from({ length: 31 }, (_, i) => shift(start, i))
    .filter(day => persianDateParts(dateAtNoon(day)).month === month);
  const offset = (dateAtNoon(start).getUTCDay() + 1) % 7;

  return <div className={styles.calendar} role="group" aria-label="تقویم شمسی">
    <div className={styles.weekControls}>
      <button type="button" disabled={start <= firstOfMonth(today)} aria-label="ماه قبل" onClick={() => setStart(firstOfMonth(shift(start, -1)))}><ArrowRight size={16} aria-hidden="true" /></button>
      <strong aria-live="polite">{title.format(dateAtNoon(start))}</strong>
      <button type="button" aria-label="ماه بعد" onClick={() => setStart(shift(start, days.length))}><ArrowLeft size={16} aria-hidden="true" /></button>
    </div>
    <div className={styles.monthGrid}>
      {["ش", "ی", "د", "س", "چ", "پ", "ج"].map(day => <span key={day} aria-hidden="true">{day}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
      {days.map((day, i) => <button type="button" key={day} disabled={day < today} aria-label={full.format(dateAtNoon(day))} aria-pressed={day === selected} onClick={() => onSelect(day)}>{toP(i + 1)}</button>)}
    </div>
  </div>;
}

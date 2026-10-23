import type { components } from "@sabz-zendegi/api-client";

export type AvailabilityDay = { date: string; slots: components["schemas"]["PatientAvailabilityItemDto"][] };

const BOOKING_TIME_ZONE = "Asia/Tehran";
const tehranDate = (value: Date) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
    timeZone: BOOKING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export function availabilityDateRange(now = new Date(), days = 7) {
  const fromDate = tehranDate(now);
  const [year, month, day] = fromDate.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day + days - 1));
  return { fromDate, toDate: end.toISOString().slice(0, 10) };
}

export function groupAvailability(items: components["schemas"]["PatientAvailabilityItemDto"][]): AvailabilityDay[] {
  const byDate = new Map<string, components["schemas"]["PatientAvailabilityItemDto"][]>();
  for (const item of items) byDate.set(item.localDate, [...(byDate.get(item.localDate) ?? []), item]);
  return [...byDate.entries()].map(([date, slots]) => ({ date, slots }));
}

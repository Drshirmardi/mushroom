import type { components } from "@sabz-zendegi/api-client";

export type AvailabilityDay = { date: string; slots: components["schemas"]["PatientAvailabilityItemDto"][] };

export function availabilityDateRange(now = new Date(), days = 7) {
  const fromDate = now.toISOString().slice(0, 10);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + days - 1);
  return { fromDate, toDate: end.toISOString().slice(0, 10) };
}

export function groupAvailability(items: components["schemas"]["PatientAvailabilityItemDto"][]): AvailabilityDay[] {
  const byDate = new Map<string, components["schemas"]["PatientAvailabilityItemDto"][]>();
  for (const item of items) byDate.set(item.localDate, [...(byDate.get(item.localDate) ?? []), item]);
  return [...byDate.entries()].map(([date, slots]) => ({ date, slots }));
}

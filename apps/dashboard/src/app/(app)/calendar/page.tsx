import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { CalendarPage } from "@/features/calendar/calendar-page";

export const metadata: Metadata = pageMetadata("calendar");

export default function Page() {
  return <CalendarPage />;
}

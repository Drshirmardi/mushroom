import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { AppointmentsPage } from "@/features/appointments/appointments-page";

export const metadata: Metadata = pageMetadata("appointments");

export default function Page() {
  return <AppointmentsPage />;
}

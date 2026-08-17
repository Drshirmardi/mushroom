import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { PrescriptionsPage } from "@/features/prescriptions/prescriptions-page";

export const metadata: Metadata = pageMetadata("prescriptions");

export default function Page() {
  return <PrescriptionsPage />;
}

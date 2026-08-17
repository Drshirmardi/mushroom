import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { HealthTrackingPage } from "@/features/health-tracking/health-tracking-page";

export const metadata: Metadata = pageMetadata("health-tracking");

export default function Page() {
  return <HealthTrackingPage />;
}

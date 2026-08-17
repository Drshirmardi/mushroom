import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { DashboardPage } from "@/features/dashboard/dashboard-page";

export const metadata: Metadata = pageMetadata("dashboard");

export default function Page() {
  return <DashboardPage />;
}

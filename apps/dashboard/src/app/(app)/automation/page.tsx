import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { AutomationPage } from "@/features/automation/automation-page";

export const metadata: Metadata = pageMetadata("automation");

export default function Page() {
  return <AutomationPage />;
}

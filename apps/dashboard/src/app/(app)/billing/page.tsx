import type { Metadata } from "next";

import { BillingPage } from "@/features/billing/billing-page";
import { pageMetadata } from "@/lib/page-meta";

export const metadata: Metadata = pageMetadata("billing");

export default function BillingRoute() {
  return <BillingPage />;
}

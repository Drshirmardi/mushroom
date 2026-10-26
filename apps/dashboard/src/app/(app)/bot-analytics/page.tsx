import type { Metadata } from "next";

import { DeferredFeaturePage } from "@/components/layout/deferred-feature-page";
import { pageMetadata } from "@/lib/page-meta";

export const metadata: Metadata = pageMetadata("bot-analytics");

export default function Page() {
  return <DeferredFeaturePage title="آنالیز ربات‌ها" />;
}

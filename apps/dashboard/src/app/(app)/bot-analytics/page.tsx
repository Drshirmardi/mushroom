import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotAnalyticsPage } from "@/features/bot-analytics/bot-analytics-page";

export const metadata: Metadata = pageMetadata("bot-analytics");

export default function Page() {
  return <BotAnalyticsPage />;
}

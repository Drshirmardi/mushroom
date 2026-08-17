import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotFlowsPage } from "@/features/bot-flows/bot-flows-page";

export const metadata: Metadata = pageMetadata("bot-flows");

export default function Page() {
  return <BotFlowsPage />;
}

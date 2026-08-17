import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotCampaignsPage } from "@/features/bot-campaigns/bot-campaigns-page";

export const metadata: Metadata = pageMetadata("bot-campaigns");

export default function Page() {
  return <BotCampaignsPage />;
}

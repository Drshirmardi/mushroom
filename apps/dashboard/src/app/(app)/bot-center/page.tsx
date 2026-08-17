import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotCenterPage } from "@/features/bot-center/bot-center-page";

export const metadata: Metadata = pageMetadata("bot-center");

export default function Page() {
  return <BotCenterPage />;
}

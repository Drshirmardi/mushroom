import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotConversationsPage } from "@/features/bot-conversations/bot-conversations-page";

export const metadata: Metadata = pageMetadata("bot-conversations");

export default function Page() {
  return <BotConversationsPage />;
}

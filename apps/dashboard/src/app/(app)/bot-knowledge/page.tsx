import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotKnowledgePage } from "@/features/bot-knowledge/bot-knowledge-page";

export const metadata: Metadata = pageMetadata("bot-knowledge");

export default function Page() {
  return <BotKnowledgePage />;
}

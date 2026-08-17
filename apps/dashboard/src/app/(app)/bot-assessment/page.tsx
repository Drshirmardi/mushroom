import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { BotAssessmentPage } from "@/features/bot-assessment/bot-assessment-page";

export const metadata: Metadata = pageMetadata("bot-assessment");

export default function Page() {
  return <BotAssessmentPage />;
}

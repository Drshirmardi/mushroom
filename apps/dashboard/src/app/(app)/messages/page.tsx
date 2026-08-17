import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { MessagesPage } from "@/features/messages/messages-page";

export const metadata: Metadata = pageMetadata("messages");

export default function Page() {
  return <MessagesPage />;
}

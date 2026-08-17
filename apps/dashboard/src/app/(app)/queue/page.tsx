import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { QueuePage } from "@/features/queue/queue-page";

export const metadata: Metadata = pageMetadata("queue");

export default function Page() {
  return <QueuePage />;
}

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const metadata: Metadata = pageMetadata("notifications");

export default function Page() {
  return <NotificationsPage />;
}

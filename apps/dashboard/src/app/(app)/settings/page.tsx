import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { SettingsPage } from "@/features/settings/settings-page";

export const metadata: Metadata = pageMetadata("settings");

export default function Page() {
  return <SettingsPage />;
}

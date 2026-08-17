import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { StoreCrmPage } from "@/features/store-crm/store-crm-page";

export const metadata: Metadata = pageMetadata("store-crm");

export default function Page() {
  return <StoreCrmPage />;
}

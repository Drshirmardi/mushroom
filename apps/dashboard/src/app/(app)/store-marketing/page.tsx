import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { StoreMarketingPage } from "@/features/store-marketing/store-marketing-page";

export const metadata: Metadata = pageMetadata("store-marketing");

export default function Page() {
  return <StoreMarketingPage />;
}

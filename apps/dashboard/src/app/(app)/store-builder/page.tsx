import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { StoreBuilderPage } from "@/features/store-builder/store-builder-page";

export const metadata: Metadata = pageMetadata("store-builder");

export default function Page() {
  return <StoreBuilderPage />;
}

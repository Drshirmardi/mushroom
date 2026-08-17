import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { StorePage } from "@/features/store/store-page";

export const metadata: Metadata = pageMetadata("store");

export default function Page() {
  return <StorePage />;
}

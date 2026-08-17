import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { RevenuePage } from "@/features/revenue/revenue-page";

export const metadata: Metadata = pageMetadata("revenue");

export default function Page() {
  return <RevenuePage />;
}

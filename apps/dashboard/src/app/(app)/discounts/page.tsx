import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { DiscountsPage } from "@/features/discounts/discounts-page";

export const metadata: Metadata = pageMetadata("discounts");

export default function Page() {
  return <DiscountsPage />;
}

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { ContentPage } from "@/features/content/content-page";

export const metadata: Metadata = pageMetadata("content");

export default function Page() {
  return <ContentPage />;
}

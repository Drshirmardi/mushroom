import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-meta";
import { AssessmentsPage } from "@/features/assessments/assessments-page";

export const metadata: Metadata = pageMetadata("assessments");

export default function Page() {
  return <AssessmentsPage />;
}

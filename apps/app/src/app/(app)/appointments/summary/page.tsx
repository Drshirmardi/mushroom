"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";

export default function ConsultationSummaryPage() {
  const router = useRouter();
  return <div><PageHeader title="خلاصه مشاوره" onBack={() => router.push("/appointments")} /><div className="px-4"><p className="rounded-2xl border border-border bg-white p-5 text-sm leading-7 text-muted-foreground">خلاصه بالینی ویزیت پس از تکمیل فضای درمانی Phase 06 در دسترس خواهد بود.</p></div></div>;
}

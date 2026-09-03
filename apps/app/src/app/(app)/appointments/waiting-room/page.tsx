"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";

export default function OnlineWaitingRoomPage() {
  const router = useRouter();
  return <div><PageHeader title="اتاق انتظار" onBack={() => router.push("/appointments")} /><div className="px-4"><p className="rounded-2xl border border-border bg-white p-5 text-sm leading-7 text-muted-foreground">اتاق انتظار ویزیت آنلاین در این مرحله از محصول ارائه نشده است. نوبت‌های شما در فهرست نوبت‌ها قابل مشاهده‌اند.</p></div></div>;
}

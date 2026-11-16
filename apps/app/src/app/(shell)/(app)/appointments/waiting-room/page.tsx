"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";

export default function OnlineWaitingRoomPage() {
  const router = useRouter();
  const appointmentId = useSearchParams().get("appointmentId");
  const openChat = () => {
    if (appointmentId) router.push(`/chat?appointmentId=${encodeURIComponent(appointmentId)}`);
  };
  return <div><PageHeader title="اتاق انتظار" onBack={() => router.push("/appointments")} /><div className="px-4"><div className="rounded-2xl border border-border bg-white p-5 text-sm leading-7"><p>آمادگی و حضور برای نوبت آنلاین فقط در بازهٔ معتبر نوبت روی سرور بررسی می‌شود.</p><p className="mt-2 text-muted-foreground">در MVP جلسهٔ صوتی یا تصویری وجود ندارد؛ تنها گفتگوی متنی در دسترس است.</p>{appointmentId ? <button onClick={openChat} className="mt-4 rounded-xl bg-primary px-4 py-2 text-white">ورود به گفتگوی متنی</button> : <p role="alert" className="mt-4 text-red-700">شناسه نوبت برای ورود به اتاق انتظار مشخص نیست.</p>}</div></div></div>;
}

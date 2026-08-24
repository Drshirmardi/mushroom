"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export default function MedicalProfilePage() {
  const router = useRouter();
  return <div><PageHeader title="پروفایل پزشکی" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4"><section className="rounded-2xl border border-border bg-white p-5"><FileText className="mb-3 text-primary" size={24} /><h1 className="text-base font-bold text-foreground">اطلاعات خوداظهاری</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">آلرژی‌ها، بیماری‌های مزمن و داروهای مصرفی تنها گزارش بیمار هستند؛ تا زمانی که داده واقعی دریافت نشده، مقدار نمونه یا شاخص تفسیرشده نمایش داده نمی‌شود.</p></section><button type="button" onClick={() => router.push("/onboarding")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white">تکمیل اطلاعات خوداظهاری <ArrowLeft size={16} /></button></div></div>;
}

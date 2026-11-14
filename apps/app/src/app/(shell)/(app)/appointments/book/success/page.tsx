"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SuccessScreen } from "@/components/shared/success-screen";
import { LoadingState } from "@/components/shared/skeletons";
import { toP } from "@/lib/format";

function BookSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const appointmentId = params.get("appointmentId");
  const changed = params.get("changed") === "1";
  const appointments = () => router.push("/appointments");

  return <div>
    <PageHeader title="" onBack={appointments} />
    <div className="space-y-4 px-4 pb-6">
      {appointmentId ? <>
        <SuccessScreen title={changed ? "زمان نوبت تغییر کرد" : "نوبت ثبت شد"} desc={changed ? "زمان نوبت شما به‌روزرسانی شد." : "نوبت شما در انتظار تأیید کلینیک است."} onDone={appointments} />
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold">کد پیگیری</p>
          <bdi className="block font-bold text-primary">{toP(appointmentId.slice(0, 8))}</bdi>
        </div>
        <Link href={`/appointments/${encodeURIComponent(appointmentId)}`} className="service-text-action">مشاهدهٔ جزئیات نوبت</Link>
      </> : <Link href="/appointments" className="service-text-action">مشاهدهٔ نوبت‌های من</Link>}
    </div>
  </div>;
}

export default function BookSuccessPage() {
  return <Suspense fallback={<LoadingState variant="list" />}><BookSuccess /></Suspense>;
}

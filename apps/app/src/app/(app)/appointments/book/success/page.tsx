"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SuccessScreen } from "@/components/shared/success-screen";
import { toP } from "@/lib/format";

export default function BookSuccessPage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="" onBack={() => router.back()} />
      <div className="px-4">
        <SuccessScreen title="نوبت با موفقیت ثبت شد!" desc="یادآوری یک روز قبل از نوبت برای شما ارسال خواهد شد." onDone={() => router.push("/")} />
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm -mt-2">
          <p className="text-xs font-bold text-muted-foreground mb-3">کد پیگیری</p>
          <div className="flex items-center justify-between bg-muted rounded-xl p-3"><span className="text-lg font-black text-primary tracking-widest">{toP("APT-10031")}</span><button className="text-xs text-primary font-bold">کپی</button></div>
        </div>
      </div>
    </div>
  );
}

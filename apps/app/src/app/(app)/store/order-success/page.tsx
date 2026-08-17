"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SuccessScreen } from "@/components/shared/success-screen";
import { toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

export default function OrderSuccessPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  return (
    <div>
      <PageHeader title="" onBack={() => router.back()} />
      <div className="px-4">
        <SuccessScreen title="سفارش ثبت شد!" desc="سفارش شما ثبت شد و به زودی ارسال می‌شود." onDone={() => router.push("/")} />
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm -mt-2 space-y-3">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">کد سفارش</span><span className="text-sm font-black text-primary">{toP("ORD-10024")}</span></div>
          <button onClick={() => navigateScreen("OrderTracking")} className="w-full bg-accent text-primary rounded-xl py-3 font-bold text-sm">پیگیری سفارش</button>
        </div>
      </div>
    </div>
  );
}

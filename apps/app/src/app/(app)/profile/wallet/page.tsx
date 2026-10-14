"use client";

import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { toP } from "@/lib/format";

export default function WalletPage() {
  const router = useRouter();
  return (
    <div className="profile-scope">
      <PageHeader title="کیف پول" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4 pt-4">
        <div className="bg-gradient-to-l from-blue-800 to-blue-600 rounded-3xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-16 -translate-y-16" aria-hidden="true" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8" aria-hidden="true" />
          <p className="text-white/70 text-sm mb-1">موجودی کیف پول</p>
          <p className="font-digikala text-4xl font-extrabold tabular-nums">{toP(0)} <span className="text-base font-bold">تومان</span></p>
          <p className="mt-4 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">شارژ و انتقال به‌زودی فعال می‌شود</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-sm font-bold text-foreground mb-3">تراکنش‌های اخیر</p>
          <div className="py-8 text-center">
            <History size={28} className="mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-bold text-foreground">تراکنشی وجود ندارد.</p>
            <p className="mt-1 text-xs text-muted-foreground">تاریخچه تراکنش‌های شما اینجا نمایش داده می‌شود.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

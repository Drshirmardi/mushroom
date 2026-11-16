"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { followUpErrorMessage, getMezajResult, type MezajResult } from "@/lib/follow-up-api";
import { useScreenNavigation } from "@/lib/navigation";

const displayValue = (item: unknown) => typeof item === "string" || typeof item === "number" ? String(item) : null;

export default function MezajDetailPage() {
  const router = useRouter(); const navigateScreen = useScreenNavigation(); const { authentication } = useAuthSession(); const [result, setResult] = useState<MezajResult | null>(null); const [error, setError] = useState<string | null>(null);
  const reload = () => { setResult(null); setError(null); void getMezajResult(authentication.accessToken).then(setResult, (reason: unknown) => setError(followUpErrorMessage(reason))); };
  useEffect(reload, [authentication.accessToken]);
  const entries = result ? Object.entries(result.resultBand).filter(([, item]) => displayValue(item) !== null) : [];
  return <div><PageHeader title="مزاج شما" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4">{!result && !error && <LoadingState label="در حال دریافت نتیجهٔ مزاج…" variant="list" />}{error && <div role="alert" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground"><p>{error}</p><button onClick={reload} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{result && <><div className="rounded-3xl bg-primary p-6 text-center text-white"><Leaf className="mx-auto mb-3" size={42} /><h2 className="text-2xl font-black">نتیجهٔ ارزیابی مزاج</h2><p className="mt-2 text-sm text-white/70">بر پایهٔ ارزیابی تکمیل‌شدهٔ شما</p><div className="mt-4 rounded-2xl bg-white/10 p-3 text-xs text-white/80">تاریخ ارزیابی: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(result.assessedAt))}</div></div><div className="rounded-2xl border border-border bg-white p-4"><p className="mb-3 text-sm font-bold text-foreground">خلاصهٔ نتیجه</p>{entries.length > 0 ? entries.map(([key, item]) => <div key={key} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"><span className="text-sm text-muted-foreground">{key}</span><span className="text-sm font-semibold text-foreground">{displayValue(item)}</span></div>) : <p className="text-sm text-muted-foreground">جزئیات قابل نمایش برای این نتیجه ثبت نشده است.</p>}</div></>}<button onClick={() => navigateScreen("BookStep1")} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-md shadow-primary/20">مشاوره با پزشک</button></div></div>;
}

"use client";
import { RefreshIndicator } from "@/components/shared/heartbeat-loader";
import { LoadingState } from "@/components/shared/skeletons";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/page-header";
import { SuccessScreen } from "@/components/shared/success-screen";
import { useAuthSession } from "@/components/auth/session-gate";
import { createHealthObservation, followUpErrorMessage, listHealthObservations, type HealthObservation } from "@/lib/follow-up-api";
import { toP } from "@/lib/format";

const PainTrendChart = dynamic(() => import("@/components/trackers/pain-trend-chart"), { ssr: false, loading: () => <LoadingState label="در حال دریافت روند درد…" variant="card" /> });

export default function PainTrackerPage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const [pain, setPain] = useState(3);
  const [selectedLoc, setSelectedLoc] = useState("کمر");
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<HealthObservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const chartData = useMemo(() => (history ?? []).slice(0, 7).reverse().map((item) => ({ day: new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(new Date(item.observedAt)), value: item.value })), [history]);
  const readGeneration = useRef(0); const [refreshing, setRefreshing] = useState(false);
  const reload = useCallback(() => { const request = ++readGeneration.current; setRefreshing(true); setError(null); void listHealthObservations(authentication.accessToken, "PAIN").then((value) => { if (request === readGeneration.current) setHistory(value.items); }, (reason: unknown) => { if (request === readGeneration.current) setError(followUpErrorMessage(reason)); }).finally(() => { if (request === readGeneration.current) setRefreshing(false); }); }, [authentication.accessToken]);
  useEffect(() => { const requests = readGeneration; setHistory(null); reload(); return () => { requests.current++; }; }, [reload]);
  const save = async () => { if (saving) return; setSaving(true); setError(null); try { const item = await createHealthObservation(authentication.accessToken, { metric: "PAIN", value: pain, observedAt: new Date().toISOString() }); setHistory((current) => [item, ...(current ?? [])]); setSaved(true); } catch (reason) { setError(followUpErrorMessage(reason, "ثبت درد ممکن نشد؛ دوباره تلاش کنید.")); } finally { setSaving(false); } };
  if (saved) return <div><PageHeader title="ثبت درد" onBack={() => setSaved(false)} /><SuccessScreen title="درد ثبت شد!" desc="اطلاعات درد برای دکتر شیرمردی ارسال شد." onDone={() => router.back()} /></div>;
  return (
    <div>
      <PageHeader title="ردیابی درد" onBack={() => router.back()} />
      <div className="px-4 space-y-5 pb-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-4">شدت درد امروز</p>
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button key={n} onClick={() => setPain(n)} className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${pain === n ? "bg-primary text-white scale-125" : pain > n ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{toP(n)}</button>
            ))}
          </div>
          <div className={`mt-3 p-3 rounded-2xl text-center ${pain <= 3 ? "bg-green-50" : pain <= 6 ? "bg-amber-50" : "bg-red-50"}`}>
            <p className={`text-2xl font-black ${pain <= 3 ? "text-green-600" : pain <= 6 ? "text-amber-600" : "text-red-600"}`}>{toP(pain)}/۱۰</p>
            <p className={`text-xs font-semibold mt-1 ${pain <= 3 ? "text-green-700" : pain <= 6 ? "text-amber-700" : "text-red-700"}`}>{pain <= 3 ? "درد خفیف" : pain <= 6 ? "درد متوسط" : "درد شدید"}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-3">محل درد</p>
          <div className="flex flex-wrap gap-2">
            {["گردن", "کمر", "شانه", "سر", "زانو", "مچ دست"].map(loc => (
              <button key={loc} onClick={() => setSelectedLoc(loc)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedLoc === loc ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{loc}</button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-foreground">روند ثبت‌شده</p><button onClick={reload} className="text-xs font-semibold text-primary">به‌روزرسانی</button></div>
          {refreshing && history && <RefreshIndicator />}{!history && !error && <LoadingState label="در حال دریافت روند درد…" variant="card" />}
          {error && <p role="alert" className="py-3 text-center text-sm text-red-700">{error}</p>}
          {history?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">هنوز دردی ثبت نشده است.</p>}
          {chartData.length > 0 && <PainTrendChart data={chartData} />}
        </div>
        <button disabled={saving} onClick={save} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-60" aria-busy={Boolean(saving)}>{saving ? <><HeartbeatLoader />{"در حال ثبت…"}</> : "ثبت درد امروز"}</button>
      </div>
    </div>
  );
}

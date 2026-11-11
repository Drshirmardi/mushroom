"use client";
import { RefreshIndicator } from "@/components/shared/heartbeat-loader";
import { LoadingState } from "@/components/shared/skeletons";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthSession } from "@/components/auth/session-gate";
import { createHealthObservation, followUpErrorMessage, listHealthObservations, type HealthObservation } from "@/lib/follow-up-api";
import { toP } from "@/lib/format";

const MoodTrendChart = dynamic(() => import("@/components/trackers/mood-trend-chart"), { ssr: false, loading: () => <LoadingState label="در حال دریافت روند…" variant="card" /> });

const MOODS = [
  { emoji: "😞", label: "خیلی بد", val: 1 },
  { emoji: "😔", label: "بد", val: 2 },
  { emoji: "😐", label: "معمولی", val: 3 },
  { emoji: "🙂", label: "خوب", val: 4 },
  { emoji: "😊", label: "عالی", val: 5 },
];

export default function MoodTrackerPage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const [selected, setSelected] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(6);
  const [history, setHistory] = useState<HealthObservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const chartData = useMemo(() => {
    const days = new Map<string, { day: string; mood?: number; sleep?: number; energy?: number }>();
    (history ?? []).slice().reverse().forEach((item) => { const key = new Date(item.observedAt).toLocaleDateString("en-CA"); const day = days.get(key) ?? { day: new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(new Date(item.observedAt)) }; if (item.metric === "MOOD") day.mood = item.value; if (item.metric === "SLEEP_HOURS") day.sleep = item.value; if (item.metric === "ENERGY") day.energy = item.value; days.set(key, day); });
    return [...days.values()].slice(-7);
  }, [history]);
  const readGeneration = useRef(0); const [refreshing, setRefreshing] = useState(false);
  const reload = useCallback(() => { const request = ++readGeneration.current; setRefreshing(true); setError(null); void listHealthObservations(authentication.accessToken).then((value) => { if (request === readGeneration.current) setHistory(value.items.filter((item) => ["MOOD", "SLEEP_HOURS", "STRESS", "ENERGY"].includes(item.metric))); }, (reason: unknown) => { if (request === readGeneration.current) setError(followUpErrorMessage(reason)); }).finally(() => { if (request === readGeneration.current) setRefreshing(false); }); }, [authentication.accessToken]);
  useEffect(() => { const requests = readGeneration; setHistory(null); reload(); return () => { requests.current++; }; }, [reload]);
  const save = async () => { if (saving) return; setSaving(true); setError(null); const observedAt = new Date().toISOString(); try { const saved = await Promise.all([createHealthObservation(authentication.accessToken, { metric: "MOOD", value: selected, observedAt }), createHealthObservation(authentication.accessToken, { metric: "SLEEP_HOURS", value: sleep, observedAt }), createHealthObservation(authentication.accessToken, { metric: "STRESS", value: stress, observedAt }), createHealthObservation(authentication.accessToken, { metric: "ENERGY", value: energy, observedAt })]); setHistory((current) => [...saved, ...(current ?? [])]); } catch (reason) { setError(followUpErrorMessage(reason, "ثبت حال امروز ممکن نشد؛ دوباره تلاش کنید.")); } finally { setSaving(false); } };
  return (
    <div>
      <PageHeader title="ردیابی خلق‌وخو" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-4">حال امروز چطور هستید؟</p>
          <div className="flex justify-between">
            {MOODS.map(m => (
              <button key={m.val} onClick={() => setSelected(m.val)} className={`flex flex-col items-center gap-1.5 transition-all ${selected === m.val ? "scale-110" : "opacity-60"}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${selected === m.val ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>{m.emoji}</div>
                <span className="text-[10px] font-semibold text-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        {[{ label: "ساعت خواب", value: sleep, set: setSleep, min: 0, max: 12, unit: "ساعت", color: "text-blue-600" }, { label: "سطح استرس", value: stress, set: setStress, min: 0, max: 10, unit: "/۱۰", color: "text-rose-600" }, { label: "سطح انرژی", value: energy, set: setEnergy, min: 0, max: 10, unit: "/۱۰", color: "text-amber-600" }].map(item => (
          <div key={item.label} className="bg-white rounded-3xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-foreground">{item.label}</p><span className={`text-lg font-black ${item.color}`}>{toP(item.value)}<span className="text-xs">{item.unit}</span></span></div>
            <input type="range" min={item.min} max={item.max} value={item.value} onChange={e => item.set(Number(e.target.value))} className="w-full accent-[#1b5e3b] h-2 rounded-full cursor-pointer" />
          </div>
        ))}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-foreground">روند ثبت‌شده</p><button onClick={reload} className="text-xs font-semibold text-primary">به‌روزرسانی</button></div>
          {refreshing && history && <RefreshIndicator />}{!history && !error && <LoadingState label="در حال دریافت روند…" variant="card" />}
          {error && <p role="alert" className="py-3 text-center text-sm text-red-700">{error}</p>}
          {history?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">هنوز موردی ثبت نشده است.</p>}
          {chartData.length > 0 && <MoodTrendChart data={chartData} />}
        </div>
        <button disabled={saving} onClick={save} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-60" aria-busy={Boolean(saving)}>{saving ? <><HeartbeatLoader />{"در حال ثبت…"}</> : "ثبت حال امروز"}</button>
      </div>
    </div>
  );
}

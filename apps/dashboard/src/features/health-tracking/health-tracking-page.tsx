"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { getAdminPatients, type AdminPatientList } from "@/lib/patient-api";
import { getAdminHealthObservations, HealthObservationsApiError, type HealthObservationMetric } from "@/lib/health-observations-api";

const METRICS: Array<{ id: HealthObservationMetric; label: string; unit: string; color: string }> = [
  { id: "PAIN", label: "درد", unit: "/۱۰", color: "#EF4444" }, { id: "MOOD", label: "حال‌و‌هوا", unit: "/۵", color: "#10B981" }, { id: "SLEEP_HOURS", label: "خواب", unit: " ساعت", color: "#6366F1" }, { id: "STRESS", label: "استرس", unit: "/۱۰", color: "#F97316" }, { id: "ENERGY", label: "انرژی", unit: "/۱۰", color: "#0EA5E9" }, { id: "WEIGHT", label: "وزن", unit: " کیلوگرم", color: "#1B5E42" },
];

export function HealthTrackingPage() {
  const { authentication } = useDashboardSession(); const [patients, setPatients] = useState<AdminPatientList["items"]>([]); const [patientId, setPatientId] = useState(""); const [metric, setMetric] = useState<HealthObservationMetric>("PAIN"); const [observations, setObservations] = useState<Awaited<ReturnType<typeof getAdminHealthObservations>> | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let cancelled = false; void getAdminPatients(authentication.accessToken).then((result) => { if (!cancelled) { setPatients(result.items); setPatientId((current) => current || result.items[0]?.patientId || ""); } }, () => { if (!cancelled) setError("فهرست بیماران دریافت نشد."); }); return () => { cancelled = true; }; }, [authentication.accessToken]);
  useEffect(() => { if (!patientId) return; let cancelled = false; setObservations(null); setError(null); void getAdminHealthObservations(authentication.accessToken, patientId, metric).then((result) => { if (!cancelled) setObservations(result); }, (reason: unknown) => { if (!cancelled) setError(reason instanceof HealthObservationsApiError && reason.status === 403 ? "اجازهٔ مشاهدهٔ دادهٔ این بیمار را ندارید." : "داده‌های سلامت دریافت نشد."); }); return () => { cancelled = true; }; }, [authentication.accessToken, metric, patientId]);
  const current = METRICS.find((item) => item.id === metric)!; const chartData = (observations?.items ?? []).map((item: { value: number; observedAt: string }) => ({ value: item.value, day: new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date(item.observedAt)) }));
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2"><User size={16} className="text-muted-foreground" /><select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm font-semibold outline-none" aria-label="بیمار">{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{String(patient.displayName ?? patient.phone)}</option>)}</select></div>
        <div className="flex items-center gap-1.5 mr-auto">
          {METRICS.map((item) => (
            <button key={item.id} onClick={() => setMetric(item.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${metric === item.id ? "text-white shadow-sm" : "bg-secondary text-muted-foreground"}`} style={metric === item.id ? { background: item.color } : {}}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">{current.label}</h2></div>
        <div className="p-5">
          {!patientId ? <p className="text-sm text-muted-foreground">بیماری برای نمایش وجود ندارد.</p> : error ? <p className="text-sm text-red-700">{error}</p> : !observations ? <p className="text-sm text-muted-foreground">در حال دریافت مشاهده‌ها…</p> : chartData.length === 0 ? <p className="text-sm text-muted-foreground">برای این معیار هنوز مشاهده‌ای ثبت نشده است.</p> : <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B8C7A" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => [`${v}${current.unit}`, current.label]} contentStyle={{ fontFamily: "var(--font-vazirmatn),sans-serif", borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke={current.color} strokeWidth={2.5} dot={{ fill: current.color, r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>}
        </div>
      </div>
    </div>
  );
}

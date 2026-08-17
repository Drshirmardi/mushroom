"use client";

import { APPTS } from "@/data/appointments";
import { Avatar, TypeBadge } from "@/components/shared";
import { p } from "@/lib/utils";

export function QueuePage() {
  const active = APPTS.filter(a => ["در حال انجام", "تایید شده"].includes(a.status));
  const current = active[0], next = active[1], remaining = active.slice(2);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{ label: "در حال ویزیت", value: "۱ بیمار", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" }, { label: "در صف انتظار", value: p(remaining.length) + " بیمار", cls: "border-amber-200 bg-amber-50 text-amber-800" }, { label: "میانگین انتظار", value: "۱۲ دقیقه", cls: "border-blue-200 bg-blue-50 text-blue-800" }, { label: "تکمیل‌شده", value: p(3) + " ویزیت", cls: "border-gray-200 bg-gray-50 text-gray-700" }].map((s, i) => (
          <div key={i} className={`rounded-2xl p-5 border-2 ${s.cls}`}><p className="text-2xl font-bold mb-1">{s.value}</p><p className="text-sm font-medium">{s.label}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card border-2 border-primary/25 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-sm font-bold text-emerald-700">در حال ویزیت</span></div>
          {current && <><Avatar letter={current.avatar} size="lg" /><h3 className="text-lg font-bold mt-4">{current.patient}</h3><p className="text-sm text-muted-foreground mt-0.5 mb-2">{current.phone}</p><TypeBadge type={current.type} /><div className="mt-2 text-xs text-muted-foreground">ساعت: {current.time}</div><div className="mt-5 space-y-2"><button className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold">پایان ویزیت</button><button className="w-full py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary">نوشتن نسخه</button></div></>}
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground mb-5">بیمار بعدی</p>
          {next && <><Avatar letter={next.avatar} size="lg" color="bg-blue-100 text-blue-700" /><h3 className="text-base font-bold mt-4">{next.patient}</h3><p className="text-sm text-muted-foreground mt-0.5 mb-2">{next.phone}</p><TypeBadge type={next.type} /><div className="mt-2 text-xs text-muted-foreground">ساعت: {next.time}</div><div className="mt-5"><button className="w-full py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary">مشاهده پرونده</button></div></>}
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">صف انتظار</h3><p className="text-xs text-muted-foreground mt-0.5">{p(remaining.length)} بیمار</p></div>
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {remaining.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-4"><span className="text-sm font-bold text-muted-foreground w-5">{p(i + 3)}</span><Avatar letter={a.avatar} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold">{a.patient}</p><p className="text-xs text-muted-foreground">{a.time}</p></div><TypeBadge type={a.type} /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

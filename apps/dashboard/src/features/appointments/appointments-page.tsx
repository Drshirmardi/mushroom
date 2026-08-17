"use client";

import { useState } from "react";
import {
  Search, Plus, Stethoscope, Video, Play, Eye, FileText, CalendarDays,
} from "lucide-react";
import { APPTS } from "@/data/appointments";
import { Avatar, StatusBadge, TypeBadge } from "@/components/shared";

export function AppointmentsPage() {
  const [tab, setTab] = useState<"inPerson" | "online">("inPerson");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("همه");
  const statuses = ["همه", "در انتظار تایید", "تایید شده", "در حال انجام", "پایان یافته", "لغو شده"];
  const filtered = APPTS.filter(a => {
    const mt = tab === "inPerson" ? a.type === "حضوری" : a.type === "آنلاین";
    const ms = a.patient.includes(search) || a.time.includes(search);
    const mst = statusFilter === "همه" || a.status === statusFilter;
    return mt && ms && mst;
  });
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {([["inPerson", "ویزیت حضوری", Stethoscope], ["online", "ویزیت آنلاین", Video]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl px-5 py-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی بیمار..." className="bg-secondary rounded-xl pr-8 pl-4 py-2 text-sm w-52 outline-none focus:ring-2 focus:ring-primary/20" /></div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {statuses.map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{s}</button>)}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors mr-auto"><Plus size={16} />نوبت جدید</button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/40">{["بیمار", "تاریخ", "ساعت", "نوع", "وضعیت", "اقدامات"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((apt, i) => (
              <tr key={apt.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 1 ? "bg-secondary/10" : ""}`}>
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar letter={apt.avatar} size="sm" /><div><p className="text-sm font-semibold">{apt.patient}</p><p className="text-xs text-muted-foreground">{apt.phone}</p></div></div></td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">۱۴۰۳/۰۴/۱۷</td>
                <td className="px-5 py-3.5 text-sm font-bold text-foreground">{apt.time}</td>
                <td className="px-5 py-3.5"><TypeBadge type={apt.type} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={apt.status} /></td>
                <td className="px-5 py-3.5"><div className="flex gap-1">{[Play, Eye, FileText, CalendarDays].map((Ic, li) => <button key={li} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Ic size={13} /></button>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-14 text-muted-foreground"><CalendarDays size={36} className="mx-auto mb-2 opacity-20" /><p className="text-sm">نوبتی یافت نشد</p></div>}
      </div>
    </div>
  );
}

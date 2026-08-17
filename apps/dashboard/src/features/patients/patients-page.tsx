"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, UserPlus } from "lucide-react";
import { PATIENTS } from "@/data/patients";
import { Avatar, StatusBadge } from "@/components/shared";
import { fm } from "@/lib/utils";

export function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const filtered = PATIENTS.filter(p => p.name.includes(search) || p.phone.includes(search));
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی بیمار..." className="w-full bg-card border border-border rounded-xl pr-8 pl-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90"><UserPlus size={16} />بیمار جدید</button>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary"><Download size={16} />خروجی</button>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(pt => (
          <div key={pt.id} onClick={() => router.push(`/patients/${pt.id}`)} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer hover:border-primary/30 group transition-all">
            <div className="flex items-center gap-4 mb-3"><Avatar letter={pt.avatar} size="md" /><div className="flex-1 min-w-0"><h3 className="font-bold group-hover:text-primary transition-colors">{pt.name}</h3><p className="text-xs text-muted-foreground">{pt.phone}</p></div><StatusBadge status={pt.status} /></div>
            <p className="text-xs text-muted-foreground mb-3 truncate">{pt.diagnosis}</p>
            <span className="text-[0.65rem] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">{pt.constitution}</span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3 mt-3">
              <span>سن: {pt.age}</span><span>ویزیت: {pt.visits}</span><span className="mr-auto text-primary font-semibold">{fm(pt.revenue)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

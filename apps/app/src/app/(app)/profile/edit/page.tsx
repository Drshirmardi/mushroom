"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const FIELDS = [
  { label: "نام کامل", key: "name" },
  { label: "سن", key: "age" },
  { label: "شهر", key: "city" },
  { label: "موبایل", key: "phone" },
  { label: "ایمیل", key: "email" },
] as const;

export default function EditProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "مریم احمدی", age: "۳۵", city: "تهران", phone: "۰۹۱۲۳۴۵۶۷۸۹", email: "maryam@example.com" });
  return (
    <div>
      <PageHeader title="ویرایش پروفایل" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="flex justify-center py-4">
          <div className="relative"><div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-primary/20"><img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=192&h=192&fit=crop" alt="پروفایل" className="w-full h-full object-cover" /></div><button className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md"><Camera size={11} />تغییر</button></div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
          {FIELDS.map(f => (
            <div key={f.key}><label className="text-xs font-bold text-muted-foreground block mb-1">{f.label}</label><input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 text-right" dir="rtl" /></div>
          ))}
        </div>
        <button onClick={() => router.back()} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20">ذخیره تغییرات</button>
      </div>
    </div>
  );
}

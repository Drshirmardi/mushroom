"use client";

import { useState } from "react";
import { ChevronDown, Plus, Zap } from "lucide-react";
import { AUTOMATIONS } from "@/data/automations";
import type { Automation } from "@/data/automations";

interface AutomationFlow {
  trigger: string;
  steps: string[];
  color: string;
  bc: string;
}

export function AutomationPage() {
  const [autos, setAutos] = useState<Automation[]>(AUTOMATIONS);
  const toggle = (id: number) => setAutos(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  const flows: AutomationFlow[] = [
    { trigger: "ارزیابی تکمیل شد", steps: ["تحلیل نتایج", "امتیاز‌دهی", "اعلان به پزشک"], color: "bg-violet-100 text-violet-700", bc: "border-violet-200" },
    { trigger: "نسخه به‌روزرسانی شد", steps: ["پردازش نسخه", "ارسال PDF", "اطلاع به بیمار"], color: "bg-blue-100 text-blue-700", bc: "border-blue-200" },
    { trigger: "نوبت فردا", steps: ["بررسی لیست", "آماده‌سازی پیام", "ارسال یادآوری"], color: "bg-amber-100 text-amber-700", bc: "border-amber-200" },
    { trigger: "موجودی کم", steps: ["بررسی موجودی", "محاسبه نیاز", "اعلان به مدیر"], color: "bg-red-100 text-red-700", bc: "border-red-200" },
  ];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-6">
      <div>
        <h2 className="font-bold mb-4">جریان‌های اتوماسیون</h2>
        <div className="grid grid-cols-4 gap-5">
          {flows.map((flow, i) => (
            <div key={i} className={`bg-card border-2 ${flow.bc} rounded-2xl p-5 shadow-sm`}>
              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold mb-4 ${flow.color}`}><Zap size={11} className="ml-1" />رویداد</div>
              <div className={`px-3 py-2 rounded-xl text-sm font-bold text-center mb-3 ${flow.color}`}>{flow.trigger}</div>
              {flow.steps.map((step, si) => (
                <div key={si}><div className="flex justify-center my-1"><ChevronDown size={16} className="text-muted-foreground" /></div><div className="px-3 py-2 bg-secondary rounded-xl text-xs font-semibold text-center">{step}</div></div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between"><h2 className="font-bold">قوانین فعال</h2><button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus size={15} />قانون جدید</button></div>
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{["رویداد محرک", "اقدام خودکار", "تعداد اجرا", "وضعیت", "کنترل"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {autos.map(a => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-5 py-4"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-sm font-semibold">{a.trigger}</span></div></td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{a.action}</td>
                <td className="px-5 py-4 text-sm font-bold">{a.runs} بار</td>
                <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${a.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{a.active ? "فعال" : "غیرفعال"}</span></td>
                <td className="px-5 py-4">
                  <button onClick={() => toggle(a.id)} className={`relative w-10 h-5 rounded-full transition-colors ${a.active ? "bg-primary" : "bg-gray-300"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${a.active ? "left-0.5" : "right-0.5"}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { AnimatePresence } from "motion/react";
import { AlertTriangle, Bell, Check, MessageCircle, Send, Share2 } from "lucide-react";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { useMedsStore } from "@/stores/meds";
import { useUiStore } from "@/stores/ui";

/**
 * App-wide bottom sheet driven by the UI store, so any screen (legacy or
 * migrated) can open it via `setSheet({ type, data })`.
 */
export function GlobalSheet() {
  const sheet = useUiStore((s) => s.sheet);
  const setSheet = useUiStore((s) => s.setSheet);
  const markMed = useMedsStore((s) => s.markMed);

  return (
    <AnimatePresence>
      {sheet && (
        <BottomSheet onClose={() => setSheet(null)}>
          {sheet.type === "medAction" && (
            <div className="space-y-2">
              <button onClick={() => { markMed(sheet.data?.id); setSheet(null); }} className="w-full flex items-center gap-3 p-4 bg-accent rounded-2xl"><Check size={18} className="text-primary" /><span className="font-semibold text-sm text-foreground">علامت‌گذاری مصرف</span></button>
              <button className="w-full flex items-center gap-3 p-4 bg-muted rounded-2xl"><Bell size={18} className="text-foreground/70" /><span className="font-semibold text-sm text-foreground">تنظیم یادآوری</span></button>
              <button className="w-full flex items-center gap-3 p-4 bg-muted rounded-2xl"><AlertTriangle size={18} className="text-amber-500" /><span className="font-semibold text-sm text-foreground">گزارش مشکل</span></button>
            </div>
          )}
          {sheet.type === "appointmentCancel" && (
            <div className="space-y-3">
              <p className="text-sm text-foreground text-center mb-2">آیا مطمئن هستید که می‌خواهید نوبت را لغو کنید؟</p>
              <button className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm border border-red-100" onClick={() => setSheet(null)}>بله، لغو کن</button>
              <button onClick={() => setSheet(null)} className="w-full py-4 bg-muted text-foreground rounded-2xl font-bold text-sm">انصراف</button>
            </div>
          )}
          {sheet.type === "shareProduct" && (
            <div className="grid grid-cols-3 gap-3">
              {[{ icon: MessageCircle, label: "واتساپ", color: "bg-green-50 text-green-700" }, { icon: Send, label: "تلگرام", color: "bg-blue-50 text-blue-700" }, { icon: Share2, label: "کپی لینک", color: "bg-muted text-foreground" }].map(s => (
                <button key={s.label} onClick={() => setSheet(null)} className={`flex flex-col items-center gap-2 p-4 ${s.color} rounded-2xl`}><s.icon size={22} /><span className="text-xs font-semibold">{s.label}</span></button>
              ))}
            </div>
          )}
        </BottomSheet>
      )}
    </AnimatePresence>
  );
}

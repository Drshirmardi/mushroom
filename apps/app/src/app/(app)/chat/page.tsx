"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Mic,
  Paperclip,
  Phone,
  Send,
  Video,
} from "lucide-react";

const MESSAGES = [
  { from: "doctor", text: "سلام مریم جان، حالتون چطوره؟", time: "۱۰:۳۰" },
  { from: "patient", text: "ممنون دکتر، کمرم کمی بهتر شده ولی هنوز دردی دارم.", time: "۱۰:۳۲" },
  { from: "doctor", text: "خوبه که بهتر شدید. دارو رو طبق دستور مصرف می‌کنید؟", time: "۱۰:۳۳" },
  { from: "patient", text: "بله، هر شب موقع خواب.", time: "۱۰:۳۴" },
  { from: "doctor", text: "عالیه. برای جلسه بعد تمرین‌های کششی رو هم اضافه کنید.", time: "۱۰:۳۵" },
];

export default function ChatPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 100px)" }}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center"><ChevronLeft size={20} style={{ transform: "rotate(180deg)" }} /></button>
        <div className="w-10 h-10 rounded-full overflow-hidden"><img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop" alt="دکتر" className="w-full h-full object-cover" /></div>
        <div className="flex-1"><p className="text-sm font-bold text-foreground">دکتر سید ابوالفتح شیرمردی</p><p className="text-xs text-green-600 font-semibold">آنلاین</p></div>
        <button><Phone size={20} className="text-primary" /></button>
        <button><Video size={20} className="text-primary" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide bg-[#f5f8f5]">
        {MESSAGES.map((m, i) => (
          <div key={i} className={`flex ${m.from === "patient" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl ${m.from === "patient" ? "bg-white border border-border rounded-tr-sm" : "bg-primary text-white rounded-tl-sm"}`}>
              <p className={`text-sm leading-6 ${m.from === "patient" ? "text-foreground" : "text-white"}`}>{m.text}</p>
              <p className={`text-[9px] mt-1 ${m.from === "patient" ? "text-muted-foreground" : "text-white/60"}`}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-white border-t border-border">
        <div className="flex items-center gap-2 bg-muted rounded-2xl px-3 py-2">
          <button><Paperclip size={18} className="text-muted-foreground" /></button>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="پیام بنویسید..." className="flex-1 bg-transparent text-sm outline-none text-right placeholder:text-muted-foreground" dir="rtl" />
          <button><Mic size={18} className="text-muted-foreground" /></button>
          <button onClick={() => setMsg("")} className={`w-8 h-8 bg-primary rounded-xl flex items-center justify-center ${!msg ? "opacity-50" : ""}`}><Send size={14} className="text-white" style={{ transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
    </div>
  );
}

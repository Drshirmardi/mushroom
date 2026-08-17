"use client";

import { useState } from "react";
import {
  ImageIcon, Mic, MoreVertical, Paperclip, Phone, Pin, Search, Send, Video,
} from "lucide-react";
import { CHAT, MESSAGES_LIST } from "@/data/messages";
import type { Conversation } from "@/data/messages";
import { Avatar } from "@/components/shared";
import { p } from "@/lib/utils";

export function MessagesPage() {
  const [active, setActive] = useState<Conversation>(MESSAGES_LIST[0]);
  const [msg, setMsg] = useState("");
  const pinned = MESSAGES_LIST.filter(m => m.pinned);
  const others = MESSAGES_LIST.filter(m => !m.pinned);
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="w-72 border-l border-border flex flex-col flex-shrink-0 bg-card">
        <div className="p-4 border-b border-border"><div className="relative"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input placeholder="جستجو..." className="w-full bg-secondary rounded-xl pr-8 pl-4 py-2 text-sm outline-none" /></div></div>
        <div className="flex-1 overflow-y-auto">
          {pinned.length > 0 && <div className="px-4 py-2 text-[0.62rem] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Pin size={10} />سنجاق‌شده</div>}
          {[...pinned, ...others].map(m => (
            <button key={m.id} onClick={() => setActive(m)} className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-secondary/50 transition-colors text-right ${active.id === m.id ? "bg-secondary" : ""}`}>
              <Avatar letter={m.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5"><div className="flex items-center gap-1.5"><p className="text-sm font-bold">{m.patient}</p>{m.pinned && <Pin size={10} className="text-muted-foreground" />}</div><span className="text-[0.62rem] text-muted-foreground">{m.time}</span></div>
                <p className="text-xs text-muted-foreground truncate">{m.lastMsg}</p>
              </div>
              {m.unread > 0 && <span className="w-5 h-5 bg-primary text-white text-[0.6rem] rounded-full flex items-center justify-center font-bold flex-shrink-0">{p(m.unread)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
          <Avatar letter={active.avatar} size="sm" />
          <div><p className="font-bold text-sm">{active.patient}</p><p className="text-xs text-emerald-600 font-medium">آنلاین</p></div>
          <div className="mr-auto flex gap-1">{[Phone, Video, Paperclip, MoreVertical].map((Ic, i) => <button key={i} className="p-2 rounded-xl hover:bg-secondary"><Ic size={16} className="text-muted-foreground" /></button>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {CHAT.map(c => (
            <div key={c.id} className={`flex gap-3 ${c.from === "doctor" ? "flex-row-reverse" : ""}`}>
              {c.from === "patient" && <Avatar letter={active.avatar} size="xs" />}
              {c.from === "doctor" && <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[0.6rem] font-bold flex-shrink-0">ا</div>}
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${c.from === "doctor" ? "bg-primary text-primary-foreground rounded-tl-sm" : "bg-card border border-border text-foreground rounded-tr-sm"}`}>
                {c.type === "file" ? <div className="flex items-center gap-2"><Paperclip size={13} />{c.text}</div> : c.text}
                <p className={`text-[0.6rem] mt-1 ${c.from === "doctor" ? "text-white/60" : "text-muted-foreground"}`}>{c.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-2">
            {[Paperclip, Mic, ImageIcon].map((Ic, i) => <button key={i} className="text-muted-foreground hover:text-foreground"><Ic size={17} /></button>)}
            <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="پیام خود را بنویسید..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 mr-2" />
            <button className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90 flex-shrink-0"><Send size={15} className="text-white" /></button>
          </div>
          <div className="flex items-center gap-3 mt-2 px-2 text-xs text-muted-foreground"><span>📎 فایل پزشکی</span><span>📋 ارسال نسخه</span><span>📝 یادداشت داخلی</span></div>
        </div>
      </div>
    </div>
  );
}

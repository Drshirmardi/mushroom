"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, MessageSquare, Search } from "lucide-react";
import { metaForPathname } from "@/lib/page-meta";
import { NotifPanel } from "./notif-panel";

export function Header() {
  const [showNotif, setShowNotif] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = metaForPathname(pathname);

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-7 h-16 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-base font-bold text-foreground leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="جستجو..." className="bg-secondary text-sm rounded-xl pr-8 pl-4 py-2 w-56 outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/20 placeholder:text-muted-foreground/50" />
        </div>
        <div className="relative">
          <button onClick={() => setShowNotif(v => !v)} className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
            <Bell size={17} className="text-muted-foreground" />
          </button>
          {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
        </div>
        <button onClick={() => router.push("/messages")} className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
          <MessageSquare size={17} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full border border-background" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm cursor-pointer">ا</div>
      </div>
    </header>
  );
}

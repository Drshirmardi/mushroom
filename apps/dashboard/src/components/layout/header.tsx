"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, MessageSquare, UserRound } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { metaForPathname } from "@/lib/page-meta";
import { NotifPanel } from "./notif-panel";

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const [showNotif, setShowNotif] = useState(false);
  const { authentication } = useDashboardSession();
  const router = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = metaForPathname(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5 md:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuOpen} aria-label="باز کردن منوی داشبورد" className="rounded-xl p-2 hover:bg-secondary md:hidden"><Menu size={20} /></button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground leading-none">{title}</h1>
          {subtitle && <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={() => setShowNotif(v => !v)} className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
            <Bell size={17} className="text-muted-foreground" />
          </button>
          {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
        </div>
        <button onClick={() => router.push("/messages")} className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
          <MessageSquare size={17} className="text-muted-foreground" />
        </button>
        <div title={authentication.user.phone} aria-label={`حساب ${authentication.user.phone}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={16} /></div>
      </div>
    </header>
  );
}

"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, MessageSquare, UserRound } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { metaForPathname } from "@/lib/page-meta";
import { NotifPanel } from "./notif-panel";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const [showNotif, setShowNotif] = useState(false);
  const notificationButton = useRef<HTMLButtonElement>(null);
  const { authentication } = useDashboardSession();
  const router = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = metaForPathname(pathname);

  return (
    <header className="dashboard-header" onKeyDown={event => {
      if (event.key === "Escape" && showNotif) { setShowNotif(false); notificationButton.current?.focus(); }
    }}>
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuOpen} aria-label="باز کردن منوی داشبورد" className="dashboard-icon lg:hidden"><Menu size={20} /></button>
        <CommandPalette />
        <div className="hidden min-w-0 border-s border-border ps-4 xl:block" title={subtitle}>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </div>
      <div className="ms-auto flex items-center gap-1">
        <ThemeToggle />
        <div className="relative">
          <button ref={notificationButton} type="button" onClick={() => setShowNotif(v => !v)} aria-label="اعلان‌ها" aria-expanded={showNotif} className="dashboard-icon">
            <Bell size={17} className="text-muted-foreground" />
          </button>
          {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
        </div>
        <button type="button" onClick={() => router.push("/messages")} aria-label="پیام‌ها" className="dashboard-icon">
          <MessageSquare size={17} className="text-muted-foreground" />
        </button>
        <div title={authentication.user.phone} aria-label={`حساب ${authentication.user.phone}`} className="dashboard-account-avatar ms-2"><UserRound size={17} /></div>
      </div>
    </header>
  );
}

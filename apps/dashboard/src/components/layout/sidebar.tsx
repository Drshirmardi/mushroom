"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Settings, Syringe, X } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { NAV, NAV_GROUPS } from "@/lib/nav";

const ROLE_LABELS = {
  ADMIN: "مدیر سیستم",
  DOCTOR: "پزشک",
  STAFF: "کارمند کلینیک",
  PATIENT: "بیمار",
} as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { authentication, logout } = useDashboardSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const roleLabel = ROLE_LABELS[authentication.user.roles.find((role) => role !== "PATIENT") ?? "PATIENT"];

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(false);
    if (!(await logout())) {
      setLoggingOut(false);
      setLogoutError(true);
    }
  };

  return (<>
    {open && <button type="button" aria-label="بستن منوی داشبورد" onClick={onClose} className="fixed inset-0 z-30 bg-black/35 md:hidden" />}
    <aside className={`fixed inset-y-0 right-0 z-40 flex h-screen w-[17rem] flex-shrink-0 flex-col overflow-y-auto transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"}`} style={{ background: "#1B5E42" }}>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Syringe size={20} className="text-white" /></div>
          <div>
            <p className="text-white font-bold text-sm leading-snug">کلینیک طب سوزنی دکتر شیرمردی</p>
            <p className="text-white/45 text-[0.7rem]">سیستم مدیریت کلینیک</p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن منو" className="mr-auto rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white md:hidden"><X size={18} /></button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group}>
            <p className="text-white/30 text-[0.6rem] font-bold tracking-widest px-2 mb-1.5 uppercase">{group}</p>
            <div className="space-y-0.5">
              {NAV.filter(n => n.group === group).map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={onClose}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${active ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/8 hover:text-white/90"}`}>
                    <Icon size={17} className={active ? "text-white" : "text-white/45 group-hover:text-white/80"} />
                    <span className="flex-1 text-right">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0" dir="ltr">{authentication.user.phone.slice(-2)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate" dir="ltr">{authentication.user.phone}</p>
            <p className="text-white/45 text-[0.7rem]">{roleLabel}</p>
          </div>
          <Link href="/settings" className="text-white/40 hover:text-white transition-colors"><Settings size={15} /></Link>
          <button type="button" onClick={handleLogout} disabled={loggingOut} aria-label="خروج از حساب" className="text-white/40 hover:text-white transition-colors disabled:opacity-50"><LogOut size={15} /></button>
        </div>
        {logoutError && <p role="alert" className="mt-2 text-[0.7rem] text-red-200">خروج انجام نشد؛ دوباره امتحان کنید.</p>}
      </div>
    </aside>
  </>
  );
}

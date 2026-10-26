"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, ChevronLeft, LogOut, PanelRightClose, PanelRightOpen, Settings, X } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { NAV, NAV_GROUPS } from "@/lib/nav";

export function Sidebar({ open, collapsed, onClose, onCollapse }: {
  open: boolean; collapsed: boolean; onClose: () => void; onCollapse: () => void;
}) {
  const pathname = usePathname();
  const { authentication, logout } = useDashboardSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [onClose]);

  const handleLogout = async () => {
    setLoggingOut(true); setLogoutError(false);
    if (!(await logout())) { setLoggingOut(false); setLogoutError(true); }
  };

  const content = (compact: boolean) => <>
    <div className="dashboard-brand">
      <Link href="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-3" aria-label="سبز زندگی — داشبورد">
        <span className="dashboard-brand-mark"><Activity size={21} aria-hidden="true" /></span>
        {!compact && <span className="min-w-0"><span className="block text-base font-extrabold tracking-tight">سبز زندگی</span><span className="block text-[11px] text-muted-foreground">پنل مدیریت کلینیک</span></span>}
      </Link>
      {!compact && <button type="button" onClick={onClose} className="dashboard-icon ms-auto lg:hidden" aria-label="بستن منو"><X size={19} /></button>}
    </div>
    <nav aria-label="منوی اصلی" className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-5">
      {NAV_GROUPS.map(group => <div key={group}>
        {!compact && <p className="mb-2 px-3 text-[11px] font-semibold text-muted-foreground">{group}</p>}
        <ul className="space-y-1">{NAV.filter(item => item.group === group).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <li key={href}><Link href={href} onClick={onClose} title={compact ? label : undefined} aria-label={compact ? label : undefined} aria-current={active ? "page" : undefined} className={`dashboard-nav-link ${compact ? "justify-center px-0" : "px-3"}`}>
            <Icon size={18} aria-hidden="true" />
            {!compact && <><span className="flex-1">{label}</span>{active && <ChevronLeft size={14} aria-hidden="true" />}</>}
          </Link></li>;
        })}</ul>
      </div>)}
    </nav>
    <div className="border-t border-border p-3">
      <div className={`flex items-center gap-2 ${compact ? "flex-col" : ""}`}>
        <span className="dashboard-account-avatar" aria-hidden="true">{authentication.user.phone.slice(-2)}</span>
        {!compact && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold"><bdi>{authentication.user.phone}</bdi></p><p className="mt-0.5 text-[11px] text-muted-foreground">مدیر سیستم</p></div>}
        <Link href="/settings" onClick={onClose} className="dashboard-icon" aria-label="تنظیمات حساب"><Settings size={17} /></Link>
        <button type="button" onClick={handleLogout} disabled={loggingOut} className="dashboard-icon" aria-label={loggingOut ? "در حال خروج" : "خروج از حساب"}><LogOut size={17} /></button>
      </div>
      {logoutError && <p role="alert" className="mt-2 text-xs text-destructive">خروج انجام نشد؛ دوباره امتحان کنید.</p>}
    </div>
  </>;

  return <>
    <aside className={`dashboard-sidebar hidden shrink-0 flex-col lg:flex ${collapsed ? "is-collapsed" : ""}`}>
      {content(collapsed)}
      <button type="button" onClick={onCollapse} className="dashboard-collapse" aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"} aria-expanded={!collapsed}>
        {collapsed ? <PanelRightOpen size={18} /> : <><PanelRightClose size={18} /><span>جمع کردن منو</span></>}
      </button>
    </aside>
    <dialog ref={drawer} className="dashboard-drawer" aria-label="منوی داشبورد" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex h-full flex-col">{content(false)}</div>
    </dialog>
  </>;
}

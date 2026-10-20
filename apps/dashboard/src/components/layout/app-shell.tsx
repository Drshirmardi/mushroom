"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

/**
 * پوسته‌ی مشترک همه‌ی صفحات: سایدبار + هدر.
 * اسکرول اصلی هر صفحه را خودش مدیریت می‌کند (صفحات عادی overflow-y-auto،
 * فضاهای کاری تمام‌صفحه مثل پیام‌ها و نسخه overflow-hidden).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dashboard-shell flex h-dvh overflow-hidden bg-background text-foreground">
      <a className="dashboard-skip" href="#dashboard-main">رفتن به محتوای اصلی</a>
      <div className="dashboard-atmosphere" aria-hidden="true"><span /><span /></div>
      <Sidebar open={sidebarOpen} collapsed={collapsed} onCollapse={() => setCollapsed(value => !value)} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main id="dashboard-main" tabIndex={-1} className="flex-1 min-h-0 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}

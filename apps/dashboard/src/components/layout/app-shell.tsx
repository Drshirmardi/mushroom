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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 min-h-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}

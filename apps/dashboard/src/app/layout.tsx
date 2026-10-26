import type { Metadata } from "next";
import Script from "next/script";
import { DashboardSessionGate } from "@/components/auth/dashboard-session-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "پنل مدیریت کلینیک طب سنتی دکتر شیرمردی",
    template: "%s — پنل مدیریت کلینیک",
  },
  description:
    "داشبورد مدیریت کلینیک طب سنتی دکتر شیرمردی — نوبت‌ها، بیماران، نسخه‌ها، فروشگاه و گزارشات",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <Script id="dashboard-appearance" strategy="beforeInteractive">{`try{var t=localStorage.getItem('dashboard-appearance-v1');document.documentElement.classList.toggle('dark',t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))}catch{document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches)}`}</Script>
      </head>
      <body className="bg-background">
        <DashboardSessionGate>{children}</DashboardSessionGate>
      </body>
    </html>
  );
}

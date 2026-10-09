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
    <html lang="fa" dir="rtl">
      <head>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-background">
        <DashboardSessionGate>{children}</DashboardSessionGate>
      </body>
    </html>
  );
}

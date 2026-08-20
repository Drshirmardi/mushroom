import type { Metadata } from "next";
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
      <body className="bg-background">{children}</body>
    </html>
  );
}

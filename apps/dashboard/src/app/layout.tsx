import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

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
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="bg-background">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { SessionGate } from "@/components/auth/session-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "سبز زندگی",
  description:
    "همراه بالینی طب سنتی — رزرو نوبت، پیگیری درمان و فروشگاه محصولات سلامت",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">
        <SessionGate>{children}</SessionGate>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SessionProvider } from "@/components/auth/session-gate";
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
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

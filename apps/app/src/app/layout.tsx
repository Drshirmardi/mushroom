import { AppLoading } from "@/components/shared/heartbeat-loader";
import { VisibleViewport } from '@/components/layout/visible-viewport';
import { AssessmentHistoryTracking } from '@/lib/assessment-history';
import { Suspense } from 'react';
import { AnalyticsTracking } from '@/components/analytics-tracking';
import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/components/auth/session-gate";
import { PatientEntryGate } from "@/components/auth/patient-entry-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "دکتر شیرمردی",
  description:
    "همراه بالینی طب سنتی — رزرو نوبت، پیگیری درمان و فروشگاه محصولات سلامت",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preload" href="/fonts/Vazirmatn-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script src="/runtime-config.js" />
      </head>
      <body className="antialiased">
        <AnalyticsTracking />
        <VisibleViewport /><AssessmentHistoryTracking /><SessionProvider><Suspense fallback={<AppLoading />}><PatientEntryGate>{children}</PatientEntryGate></Suspense></SessionProvider>
      </body>
    </html>
  );
}

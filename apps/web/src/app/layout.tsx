import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const yekanBakh = localFont({
    src: "./fonts/yekan-bakh-fanum-variable.woff2",
    display: "swap",
    preload: true,
    variable: "--font-yekan-bakh",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "دکتر شیرمردی - مرکز تخصصی طب سوزنی و سلامت هوشمند",
    description:
        "مرکز تخصصی طب سوزنی دکتر شیرمردی. درمان دردهای مزمن، خدمات زیبایی، کاهش استرس، بهبود خواب و ارزیابی هوشمند سلامت.",
    openGraph: {
        title: "AcuPremium — دکتر شیرمردی",
        description: "درمان هدفمند، آرامش پایدار، زندگی سالم‌تر با ترکیب طب سوزنی و فناوری نوین.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
    },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="fa" dir="rtl" className={yekanBakh.variable}>
            <head>
                <script src="/runtime-config.js" />
            </head>
            <body>
                {children}
                <Toaster dir="rtl" position="top-center" richColors closeButton />
            </body>
        </html>
    );
}

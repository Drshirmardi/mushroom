import type { Metadata } from "next";
import "./globals.css";

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
        <html lang="fa" dir="rtl">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=EB+Garamond:wght@600&display=swap"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}

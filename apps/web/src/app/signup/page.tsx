import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
    title: "ثبت‌نام | دکتر شیرمردی",
    description: "ساخت حساب کاربری در مرکز تخصصی طب سوزنی دکتر شیرمردی",
};

export default function SignupPage() {
    return (
        <AuthLayout
            brand={{
                title: "سفر سلامتی خود را",
                highlight: "از امروز آغاز کنید",
                description:
                    "با ساخت حساب کاربری، به ارزیابی هوشمند مزاج، برنامه درمان اختصاصی و پشتیبانی کامل کارشناسان دسترسی خواهید داشت.",
            }}
        >
            <SignupForm />
        </AuthLayout>
    );
}

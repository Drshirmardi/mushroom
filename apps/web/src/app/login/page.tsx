import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
    title: "ورود | دکتر شیرمردی",
    description: "ورود به حساب کاربری مرکز تخصصی طب سوزنی دکتر شیرمردی",
};

export default function LoginPage() {
    return (
        <AuthLayout
            brand={{
                title: "خوش برگشتید،",
                highlight: "مسیر سلامت شما ادامه دارد",
                description:
                    "برای مشاهده برنامه درمان، نتایج ارزیابی و جزئیات جلسات بعدی خود، وارد حساب کاربری شوید.",
            }}
        >
            <LoginForm />
        </AuthLayout>
    );
}

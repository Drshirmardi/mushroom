"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { loginPasswordSchema, normalizePhone, phoneSchema } from "@/lib/validation";
import { loginWithPhone } from "@/services/auth";
import { GlassCard } from "@/components/shared/GlassCard";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    Form,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneField } from "./PhoneField";
import { PasswordField } from "./PasswordField";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { AuthSwitchLink } from "./AuthSwitchLink";
import { AuthErrorAlert } from "./AuthErrorAlert";

const loginSchema = z.object({
    phone: phoneSchema,
    password: loginPasswordSchema,
    remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        mode: "onTouched",
        defaultValues: { phone: "", password: "", remember: true },
    });

    const onSubmit = async (values: LoginValues) => {
        setAuthError(null);
        const result = await loginWithPhone({
            phone: normalizePhone(values.phone),
            password: values.password,
            remember: values.remember,
        });

        if (result.ok) {
            toast.success("خوش آمدید!", { description: "ورود شما با موفقیت انجام شد." });
            router.push("/");
        } else {
            setAuthError(result.message);
        }
    };

    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold">ورود به حساب کاربری</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                    برای ادامه مسیر درمان و مشاهده برنامه اختصاصی خود، وارد شوید.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {authError && <AuthErrorAlert message={authError} />}

                    <PhoneField control={form.control} name="phone" />

                    <PasswordField control={form.control} name="password" />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <FormField
                            control={form.control}
                            name="remember"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) =>
                                                field.onChange(checked === true)
                                            }
                                        />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer text-sm font-normal text-muted-foreground">
                                        مرا به خاطر بسپار
                                    </FormLabel>
                                </FormItem>
                            )}
                        />
                        <button
                            type="button"
                            onClick={() =>
                                toast.info("بازیابی رمز عبور به‌زودی فعال می‌شود.")
                            }
                            className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                        >
                            فراموشی رمز عبور؟
                        </button>
                    </div>

                    <AuthSubmitButton loading={form.formState.isSubmitting}>
                        ورود
                    </AuthSubmitButton>
                </form>
            </Form>

            <div className="mt-6">
                <AuthSwitchLink
                    question="حساب کاربری ندارید؟"
                    to="/signup"
                    label="ثبت‌نام کنید"
                />
            </div>
        </GlassCard>
    );
}

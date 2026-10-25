"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { postAuthenticationUrl } from "@/auth/auth-navigation";
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
import { OtpAuthForm } from "./OtpAuthForm";

const loginSchema = z.object({
    phone: phoneSchema,
    password: loginPasswordSchema,
    remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

function redirectAfterAuthentication(roles: string[]) {
    const requestedDestination = new URLSearchParams(window.location.search).get("next");
    window.location.assign(postAuthenticationUrl(roles, requestedDestination));
}

function PasswordLoginForm() {
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
            redirectAfterAuthentication([...result.roles]);
        } else {
            setAuthError(result.message);
        }
    };

    return (
        <div>

            <Form {...form}>
                <form
                    method="post"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                >
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

        </div>
    );
}

export function LoginForm() {
    const [method, setMethod] = useState<"otp" | "password">("otp");
    return <GlassCard className="p-6 sm:p-8">
        <div className="mb-6 space-y-2"><h1 className="text-2xl font-bold">ورود به حساب کاربری</h1><p className="text-sm leading-6 text-muted-foreground">روش ورود را انتخاب کنید؛ کد یک‌بارمصرف سریع‌ترین مسیر است.</p></div>
        <div role="tablist" aria-label="روش ورود" className="mb-6 grid grid-cols-2 rounded-xl bg-secondary/60 p-1">
            <button role="tab" aria-selected={method === "otp"} type="button" onClick={() => setMethod("otp")} className={`rounded-lg px-3 py-2 text-sm font-bold ${method === "otp" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>کد یک‌بارمصرف</button>
            <button role="tab" aria-selected={method === "password"} type="button" onClick={() => setMethod("password")} className={`rounded-lg px-3 py-2 text-sm font-bold ${method === "password" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>رمز عبور</button>
        </div>
        {method === "otp" ? <OtpAuthForm onAuthenticated={redirectAfterAuthentication} /> : <PasswordLoginForm />}
        <div className="mt-6"><AuthSwitchLink question="حساب کاربری ندارید؟" to="/signup" label="ثبت‌نام کنید" /></div>
    </GlassCard>;
}

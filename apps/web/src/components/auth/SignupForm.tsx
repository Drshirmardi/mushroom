"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { nameSchema, normalizePhone, phoneSchema, signupPasswordSchema } from "@/lib/validation";
import { signupWithPhone } from "@/services/auth";
import { Icon } from "@/components/shared/Icon";
import { GlassCard } from "@/components/shared/GlassCard";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneField } from "./PhoneField";
import { PasswordField } from "./PasswordField";
import { PasswordStrength } from "./PasswordStrength";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { AuthSwitchLink } from "./AuthSwitchLink";
import { AuthErrorAlert } from "./AuthErrorAlert";

const signupSchema = z
    .object({
        name: nameSchema,
        phone: phoneSchema,
        password: signupPasswordSchema,
        confirmPassword: z.string().min(1, "تکرار رمز عبور را وارد کنید"),
        terms: z.boolean().refine((value) => value, "برای ساخت حساب باید قوانین را بپذیرید"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "تکرار رمز عبور با رمز عبور مطابقت ندارد",
    });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        mode: "onTouched",
        defaultValues: { name: "", phone: "", password: "", confirmPassword: "", terms: false },
    });

    const watchedPassword = form.watch("password");

    const onSubmit = async (values: SignupValues) => {
        setAuthError(null);
        const result = await signupWithPhone({
            name: values.name.trim(),
            phone: normalizePhone(values.phone),
            password: values.password,
        });

        if (result.ok) {
            toast.success("حساب کاربری شما ساخته شد!", {
                description: "اکنون می‌توانید با شماره موبایل خود وارد شوید.",
            });
            router.push("/login");
        } else {
            setAuthError(result.message);
        }
    };

    return (
        <GlassCard className="p-6 sm:p-8">
            <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold">ساخت حساب کاربری</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                    در کمتر از یک دقیقه به خانواده سلامتی بپیوندید.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    {authError && <AuthErrorAlert message={authError} />}

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field, fieldState }) => (
                            <FormItem>
                                <FormLabel>نام و نام خانوادگی</FormLabel>
                                <div className="relative">
                                    <Icon
                                        name="person"
                                        className={cn(
                                            "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground transition-colors",
                                            fieldState.error && "text-destructive",
                                        )}
                                    />
                                    <FormControl>
                                        <Input
                                            autoComplete="name"
                                            placeholder="مثلاً: سارا محمدی"
                                            className={cn(
                                                "h-12 rounded-xl pr-12",
                                                fieldState.error &&
                                                    "border-destructive bg-destructive/5 focus-visible:ring-2 focus-visible:ring-destructive",
                                            )}
                                            {...field}
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <PhoneField control={form.control} name="phone" />

                    <div className="space-y-2.5">
                        <PasswordField
                            control={form.control}
                            name="password"
                            autoComplete="new-password"
                        />
                        <PasswordStrength password={watchedPassword} />
                    </div>

                    <PasswordField
                        control={form.control}
                        name="confirmPassword"
                        label="تکرار رمز عبور"
                        autoComplete="new-password"
                    />

                    <FormField
                        control={form.control}
                        name="terms"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <div className="flex items-start gap-2">
                                    <FormControl>
                                        <Checkbox
                                            className="mt-1"
                                            checked={field.value}
                                            onCheckedChange={(checked) =>
                                                field.onChange(checked === true)
                                            }
                                        />
                                    </FormControl>
                                    <p className="text-sm font-normal leading-6 text-muted-foreground">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toast.info("متن قوانین به‌زودی ارائه می‌شود.")
                                            }
                                            className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                                        >
                                            قوانین و شرایط استفاده
                                        </button>{" "}
                                        را خوانده و می‌پذیرم.
                                    </p>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <AuthSubmitButton loading={form.formState.isSubmitting}>
                        ثبت‌نام
                    </AuthSubmitButton>
                </form>
            </Form>

            <div className="mt-6">
                <AuthSwitchLink
                    question="قبلاً ثبت‌نام کرده‌اید؟"
                    to="/login"
                    label="وارد شوید"
                />
            </div>
        </GlassCard>
    );
}

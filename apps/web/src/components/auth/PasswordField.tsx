import { useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/Icon";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface PasswordFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    label?: string;
    placeholder?: string;
    autoComplete?: string;
}

export function PasswordField<T extends FieldValues>({
    control,
    name,
    label = "رمز عبور",
    placeholder = "••••••••",
    autoComplete = "current-password",
}: PasswordFieldProps<T>) {
    const [visible, setVisible] = useState(false);

    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <div className="relative">
                        <Icon
                            name="lock"
                            className={cn(
                                "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground transition-colors",
                                fieldState.error && "text-destructive",
                            )}
                        />
                        <FormControl>
                            <Input
                                dir="ltr"
                                type={visible ? "text" : "password"}
                                autoComplete={autoComplete}
                                placeholder={placeholder}
                                className={cn(
                                    "h-12 rounded-xl pr-12 pl-12 text-left",
                                    fieldState.error &&
                                        "border-destructive bg-destructive/5 focus-visible:ring-2 focus-visible:ring-destructive",
                                )}
                                {...field}
                            />
                        </FormControl>
                        <button
                            type="button"
                            onClick={() => setVisible((value) => !value)}
                            aria-label={visible ? "مخفی‌سازی رمز عبور" : "نمایش رمز عبور"}
                            className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                            <Icon name={visible ? "visibility_off" : "visibility"} className="text-xl" />
                        </button>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

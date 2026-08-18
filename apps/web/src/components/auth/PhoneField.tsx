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

interface PhoneFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
}

export function PhoneField<T extends FieldValues>({ control, name }: PhoneFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <FormItem>
                    <FormLabel>شماره موبایل</FormLabel>
                    <div className="relative">
                        <Icon
                            name="call"
                            className={cn(
                                "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground transition-colors",
                                fieldState.error && "text-destructive",
                            )}
                        />
                        <FormControl>
                            <Input
                                dir="ltr"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
                                className={cn(
                                    "h-12 rounded-xl pr-12 text-left text-base tracking-widest",
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
    );
}

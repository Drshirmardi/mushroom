import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface StrengthLevel {
    score: 0 | 1 | 2 | 3;
    label: string;
    className: string;
}

function evaluateStrength(password: string): StrengthLevel {
    if (!password) return { score: 0, label: "", className: "" };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score += 1;
    if (password.length >= 12 || /[^a-zA-Z0-9]/.test(password)) score += 1;
    score = Math.min(score, 3) as 0 | 1 | 2 | 3;

    if (score <= 1) {
        return { score: 1, label: "ضعیف", className: "bg-destructive" };
    }
    if (score === 2) {
        return { score: 2, label: "متوسط", className: "bg-gold" };
    }
    return { score: 3, label: "قوی", className: "bg-emerald-600" };
}

export function PasswordStrength({ password }: { password: string }) {
    const strength = useMemo(() => evaluateStrength(password), [password]);

    if (!password) return null;

    return (
        <div className="flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1.5" dir="ltr">
                {[1, 2, 3].map((level) => (
                    <span
                        key={level}
                        className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors duration-300",
                            level <= strength.score
                                ? strength.className
                                : "bg-muted",
                        )}
                    />
                ))}
            </div>
            <span className="min-w-10 text-xs font-medium text-muted-foreground">
                {strength.label}
            </span>
        </div>
    );
}

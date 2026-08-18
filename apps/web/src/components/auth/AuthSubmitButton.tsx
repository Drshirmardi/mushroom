import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/Icon";

interface AuthSubmitButtonProps {
    loading: boolean;
    disabled?: boolean;
    children: ReactNode;
    className?: string;
}

export function AuthSubmitButton({
    loading,
    disabled = false,
    children,
    className = "",
}: AuthSubmitButtonProps) {
    return (
        <button
            type="submit"
            disabled={loading || disabled}
            className={cn(
                "press mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70 disabled:hover:translate-y-0",
                className,
            )}
        >
            {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                <Icon name="arrow_back" className="text-xl" />
            )}
            {children}
        </button>
    );
}

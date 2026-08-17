import type { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
    return (
        <div className={`rounded-2xl glass border border-border/70 shadow-premium ${className}`}>
            {children}
        </div>
    );
}

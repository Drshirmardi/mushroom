"use client";

import { ChevronLeft } from "lucide-react";
import type React from "react";

type PageHeaderProps = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export function PageHeader({ title, onBack, right }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
      <button type="button" aria-label="بازگشت" onClick={onBack} className="h-11 w-11 shrink-0 bg-white border border-border rounded-xl flex items-center justify-center active:scale-95 transition-transform">
        <ChevronLeft aria-hidden="true" size={20} className="text-foreground" style={{ transform: "rotate(180deg)" }} />
      </button>
      <h1 className="text-base font-bold text-center text-foreground">{title}</h1>
      <div className="flex min-w-11 justify-end">{right}</div>
    </div>
  );
}

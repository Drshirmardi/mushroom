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
    <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-background sticky top-0 z-10 border-b border-border/50">
      <button onClick={onBack} className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center active:scale-95 transition-transform">
        <ChevronLeft size={20} className="text-foreground" style={{ transform: "rotate(180deg)" }} />
      </button>
      <h1 className="text-base font-bold text-foreground">{title}</h1>
      <div className="w-9 flex justify-end">{right}</div>
    </div>
  );
}

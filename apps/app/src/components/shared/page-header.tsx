"use client";

import type React from "react";
import { StoreIcon } from "@/components/store/store-icon";

type PageHeaderProps = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  backIcon?: React.ReactNode;
};

export function PageHeader({ title, onBack, right, backIcon }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
      <button type="button" aria-label="بازگشت" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-foreground transition-transform active:scale-95">
        {backIcon ?? <StoreIcon name="arrowRight" size={20} />}
      </button>
      <h1 className="text-base font-bold text-center text-foreground">{title}</h1>
      <div className="flex min-w-11 justify-end">{right}</div>
    </div>
  );
}

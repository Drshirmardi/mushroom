"use client";

import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  desc: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, desc, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 leading-7">{desc}</p>
      {action && onAction && <button onClick={onAction} className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold">{action}</button>}
    </div>
  );
}

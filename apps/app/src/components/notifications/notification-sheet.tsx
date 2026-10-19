"use client";

import { X } from "lucide-react";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { NotificationCenter } from "./notification-center";

export function NotificationSheet({ onClose, onUpdated }: { onClose: () => void; onUpdated: () => void }) {
  return <BottomSheet title="اعلان‌ها" onClose={onClose}>
      <button type="button" aria-label="بستن اعلان‌ها" onClick={onClose} className="absolute left-4 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground"><X size={20} aria-hidden="true" /></button>
      <NotificationCenter embedded onUpdated={onUpdated} />
    </BottomSheet>;
}

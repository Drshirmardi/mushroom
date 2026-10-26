"use client";

import { BottomSheet } from "@/components/shared/bottom-sheet";
import { NotificationCenter } from "./notification-center";

export function NotificationSheet({ onClose, onUpdated }: { onClose: () => void; onUpdated: () => void }) {
  return <BottomSheet title="اعلان‌ها" onClose={onClose}>
      <NotificationCenter embedded onUpdated={onUpdated} />
    </BottomSheet>;
}

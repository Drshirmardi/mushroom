'use client';

import { BottomSheet } from '@/components/shared/bottom-sheet';
import { NotificationCenter } from './notification-center';

type NotificationSheetProps = {
  onClose: () => void;
  onUpdated: () => void;
};

export function NotificationSheet({ onClose, onUpdated }: NotificationSheetProps) {
  return (
    <BottomSheet
      title="اعلان‌ها"
      ariaLabel="مرکز اعلان‌ها"
      size="auto"
      dismissible
      showHandle
      showCloseButton
      className="max-w-[552px]"
      onClose={onClose}
    >
      <NotificationCenter embedded onUpdated={onUpdated} />
    </BottomSheet>
  );
}

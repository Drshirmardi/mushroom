"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { NotificationCenter } from "./notification-center";

export function NotificationSheet({ onClose, onUpdated }: { onClose: () => void; onUpdated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    closeButton.current?.focus();
    return () => {
      element?.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, []);

  return <dialog ref={dialog} aria-label="اعلان‌ها" onCancel={event => { event.preventDefault(); onClose(); }} className="notification-sheet m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground">
    <BottomSheet title="اعلان‌ها" onClose={onClose}>
      <button ref={closeButton} type="button" aria-label="بستن اعلان‌ها" onClick={onClose} className="absolute left-4 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground"><X size={20} aria-hidden="true" /></button>
      <NotificationCenter embedded onUpdated={onUpdated} />
    </BottomSheet>
  </dialog>;
}

"use client";

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function AssessmentDialog({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element && !element.open) element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close(); document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
      else document.querySelector<HTMLElement>('[data-assessment-list-heading]')?.focus();
    };
  }, []);

  return <dialog ref={dialog} aria-labelledby={heading} aria-busy={busy} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }} className="fixed inset-0 m-auto h-[calc(100dvh-2rem)] max-h-[60rem] w-[calc(100vw-2rem)] max-w-7xl overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm">
    <div className="flex h-full min-h-0 flex-col" dir="rtl"><header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6"><div className="min-w-0"><h2 id={heading} className="truncate text-base font-bold">{title || 'ارزیابی جدید'}</h2><p className="mt-1 text-xs text-muted-foreground">مدیریت ارزیابی</p></div><button type="button" autoFocus disabled={busy} onClick={onClose} className="dashboard-icon shrink-0" aria-label="بستن مدیریت ارزیابی"><X size={20} /></button></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div></div>
  </dialog>;
}

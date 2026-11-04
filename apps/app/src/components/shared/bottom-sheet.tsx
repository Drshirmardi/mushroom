"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type React from "react";

type BottomSheetProps = {
  title?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Native modal supplies focus containment, background inertness and focus restoration. */
export function BottomSheet({ title, ariaLabel, onClose, children }: BottomSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const y = useMotionValue(0);
  const drag = useRef({ active: false, moved: false, startY: 0 });
  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, []);
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    drag.current = { active: true, moved: false, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return;
    const delta = Math.max(0, event.clientY - drag.current.startY);
    if (delta > 6) drag.current.moved = true;
    y.set(delta);
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (y.get() > 90) onClose();
    else if (reduceMotion) y.set(0);
    else void animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
  };
  return (
    <dialog ref={dialog} className="patient-bottom-sheet patient-app-shell" aria-label={ariaLabel ?? title ?? "پنجرهٔ گزینه‌ها"} onCancel={event => { event.preventDefault(); onClose(); }}>
    <motion.div className="patient-sheet-viewport absolute inset-0 z-50 flex flex-col justify-end" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <motion.div className="relative mx-auto w-full max-w-[720px] bg-white rounded-t-3xl px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] patient-sheet-panel overflow-y-auto overscroll-contain scrollbar-hide"
        style={{ y }}
        initial={reduceMotion ? false : { y: "100%" }} animate={{ y: 0 }} exit={reduceMotion ? { opacity: 0 } : { y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
        <button
          type="button"
          className="patient-bottom-sheet__handle mx-auto -mt-2 block min-h-11 cursor-grab px-16 pb-3 pt-4 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="بستن پنجره"
          onClick={event => { if (event.detail === 0 || !drag.current.moved) onClose(); }}
        >
          <span className="block h-1 w-10 rounded-full bg-muted mx-auto" />
        </button>
        <div className="relative mb-4 flex min-h-11 items-center justify-center">
          {title && <h2 className="patient-bottom-sheet__title min-w-0 px-12">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="patient-bottom-sheet__close absolute end-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
    </dialog>
  );
}

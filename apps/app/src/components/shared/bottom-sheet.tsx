"use client";

import { useRef } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import type React from "react";

type BottomSheetProps = {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Dismissable sheet: overlay tap, Escape (by caller), or drag the handle down. */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const y = useMotionValue(0);
  const drag = useRef({ active: false, startY: 0 });
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    y.set(Math.max(0, event.clientY - drag.current.startY));
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (y.get() > 90) onClose();
    else void animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div className="relative mx-auto w-full max-w-[720px] bg-white rounded-t-3xl px-4 pt-2 pb-8 max-h-[85vh] overflow-y-auto scrollbar-hide"
        style={{ y }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
        <div
          className="mx-auto -mt-2 cursor-grab px-16 pb-3 pt-4 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="separator"
          aria-label="کشیدن برای بستن"
        >
          <div className="h-1 w-10 rounded-full bg-muted mx-auto" />
        </div>
        {title && <h2 className="text-base font-bold text-foreground mb-4 text-center">{title}</h2>}
        {children}
      </motion.div>
    </motion.div>
  );
}

"use client";

import { ShellOverlay } from '@/components/layout/shell-slots';
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onGoCart: () => void;
};

/** Success toast after adding to cart: slides up above the purchase bar, exits animated. */
export function AddedToCartToast({ open, onClose, onGoCart }: Props) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!open) return;
    setDone(false);
    const timer = window.setTimeout(() => setDone(true), 900);
    return () => window.clearTimeout(timer);
  }, [open]);
  return <ShellOverlay><AnimatePresence>
    {open && <motion.div
      role="status"
      className="store-toast"
      initial={{ y: 24, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      exit={{ y: 24, opacity: 0, x: "-50%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <button type="button" aria-label="بستن" onClick={onClose} className="store-toast__close"><X size={18} aria-hidden="true" /></button>
      {done
        ? <motion.span key="check" className="store-toast__check" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}><Check size={16} aria-hidden="true" /></motion.span>
        : <span key="spin" className="store-toast__spinner" aria-hidden="true" />}
      <span className="store-toast__title">کالا به سبد اضافه شد!</span>
      <button type="button" className="store-toast__go" onClick={onGoCart}>
        برو به سبد خرید<ChevronLeft size={16} aria-hidden="true" />
      </button>
    </motion.div>}
  </AnimatePresence></ShellOverlay>;
}

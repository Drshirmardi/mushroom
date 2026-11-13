"use client";

import { ShellOverlay } from '@/components/layout/shell-slots';
import { AnimatePresence, motion } from "motion/react";
import { StoreIcon } from "./store-icon";

type Props = {
  open: boolean;
  onClose: () => void;
  onGoCart: () => void;
};

/** Success toast after adding to cart: slides up above the purchase bar, exits animated. */
export function AddedToCartToast({ open, onClose, onGoCart }: Props) {
  return <ShellOverlay><AnimatePresence>
    {open && <motion.div
      role="status"
      className="store-toast"
      initial={{ y: 24, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      exit={{ y: 24, opacity: 0, x: "-50%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <button type="button" aria-label="بستن" onClick={onClose} className="store-toast__close"><StoreIcon name="close" size={18} /></button>
      <span className="store-toast__check"><StoreIcon name="check" size={16} /></span>
      <span className="store-toast__title">کالا به سبد اضافه شد!</span>
      <button type="button" className="store-toast__go" onClick={onGoCart}>
        برو به سبد خرید<StoreIcon name="arrowLeft" size={16} />
      </button>
    </motion.div>}
  </AnimatePresence></ShellOverlay>;
}

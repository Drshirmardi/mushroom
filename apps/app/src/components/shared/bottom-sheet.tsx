"use client";

import { motion } from "motion/react";
import type React from "react";

type BottomSheetProps = {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div className="relative mx-auto w-full max-w-[720px] bg-white rounded-t-3xl px-4 pt-2 pb-8 max-h-[85vh] overflow-y-auto scrollbar-hide"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
        {title && <h2 className="text-base font-bold text-foreground mb-4 text-center">{title}</h2>}
        {children}
      </motion.div>
    </motion.div>
  );
}

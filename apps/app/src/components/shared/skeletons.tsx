"use client";

import { motion } from "motion/react";

export function SkeletonBox({ className }: { className: string }) {
  return (
    <motion.div className={`bg-muted rounded-xl ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2"><SkeletonBox className="h-4 w-3/4" /><SkeletonBox className="h-3 w-1/2" /></div>
      </div>
      <SkeletonBox className="h-3 w-full" />
      <SkeletonBox className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <SkeletonBox className="w-full h-32 rounded-none" />
      <div className="p-3 space-y-2"><SkeletonBox className="h-3 w-4/5" /><SkeletonBox className="h-3 w-1/2" /></div>
    </div>
  );
}

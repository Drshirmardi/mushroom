"use client";

import { useEffect, useState } from "react";

import { AnimatedGroup } from "../motion/animated-group";

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton block rounded-xl bg-(--patient-soft) ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonBox className="h-3 w-full" />
      <SkeletonBox className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden" aria-hidden="true">
      <SkeletonBox className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <SkeletonBox className="h-3 w-4/5" />
        <SkeletonBox className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <AnimatedGroup
      className="space-y-3"
      preset="fade"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </AnimatedGroup>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <AnimatedGroup
      className="grid grid-cols-2 gap-3"
      preset="fade"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </AnimatedGroup>
  );
}

export function SkeletonProfileHeader() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <SkeletonBox className="h-[72px] w-[72px] rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-4 w-2/3" />
        <SkeletonBox className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <span aria-hidden="true" className={`spinner inline-block ${className}`} />;
}

export function LoadingState({ label = "در حال دریافت…", variant = "list", delay = 250 }: { label?: string; variant?: "list" | "grid"; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {visible && (variant === "grid" ? <SkeletonGrid /> : <SkeletonList />)}
    </div>
  );
}

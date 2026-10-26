"use client";

import { useEffect } from "react";

/** Poll only the visible payment screen, after the previous read has finished. */
export function usePaymentRefresh(enabled: boolean, refresh: () => Promise<unknown>) {
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible") timer = setTimeout(() => void tick(), 5_000);
    };
    const tick = async () => {
      if (stopped || running || document.visibilityState !== "visible") return;
      running = true;
      try { await refresh(); } finally { running = false; schedule(); }
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") void tick();
    };
    schedule();
    document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, refresh]);
}

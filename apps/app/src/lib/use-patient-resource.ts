"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patientErrorMessage } from "./patient-request";

/** Pass a useCallback loader keyed by session and resource to hide stale private data. */
export function usePatientResource<T>(load: () => Promise<T>) {
  const generation = useRef(0);
  const [snapshot, setSnapshot] = useState<{ load: typeof load; data: T | null; error: string | null; loading: boolean } | null>(null);
  const refreshing = useRef(false);
  const reload = useCallback(async (quiet = false) => {
    if (quiet && refreshing.current) return null;
    refreshing.current = true;
    const request = ++generation.current;
    if (!quiet) setSnapshot({ load, data: null, error: null, loading: true });
    try {
      const data = await load();
      if (request === generation.current) setSnapshot({ load, data, error: null, loading: false });
      return request === generation.current ? data : null;
    } catch (error) {
      if (request === generation.current) setSnapshot(previous => ({ load, data: quiet && previous?.load === load ? previous.data : null, error: patientErrorMessage(error), loading: false }));
      return null;
    } finally {
      if (request === generation.current) refreshing.current = false;
    }
  }, [load]);
  useEffect(() => { void reload(); return () => { generation.current += 1; refreshing.current = false; }; }, [reload]);
  const refresh = useCallback(() => reload(true), [reload]);
  const current = snapshot?.load === load ? snapshot : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current?.loading ?? true, reload, refresh };
}

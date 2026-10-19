"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patientErrorMessage } from "./patient-request";

/** Pass a useCallback loader keyed by session and resource to hide stale private data. */
export function usePatientResource<T>(load: () => Promise<T>) {
  const generation = useRef(0);
  const [snapshot, setSnapshot] = useState<{ load: typeof load; data: T | null; error: string | null; loading: boolean } | null>(null);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setSnapshot({ load, data: null, error: null, loading: true });
    try {
      const data = await load();
      if (request === generation.current) setSnapshot({ load, data, error: null, loading: false });
      return request === generation.current ? data : null;
    } catch (error) {
      if (request === generation.current) setSnapshot({ load, data: null, error: patientErrorMessage(error), loading: false });
      return null;
    }
  }, [load]);
  useEffect(() => { void reload(); return () => { generation.current += 1; }; }, [reload]);
  const current = snapshot?.load === load ? snapshot : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current?.loading ?? true, reload };
}

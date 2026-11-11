"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patientErrorMessage } from "./patient-request";
import { withRequestTimeout } from "@sabz-zendegi/api-client";

/** Pass a useCallback loader keyed by session and resource to hide stale private data. */
export function usePatientResource<T>(load: () => Promise<T>, initialData?: T | null) {
  const generation = useRef(0);
  const [snapshot, setSnapshot] = useState<{ load: typeof load; data: T | null; error: string | null; loading: boolean; refreshing: boolean } | null>(() =>
    initialData == null ? null : { load, data: initialData, error: null, loading: false, refreshing: false },
  );
  const refreshing = useRef(false);
  const reload = useCallback(async (quiet = false) => {
    if (quiet && refreshing.current) return null;
    refreshing.current = true;
    const request = ++generation.current;
    setSnapshot(previous => {
      const data = previous?.load === load ? previous.data : null;
      return { load, data, error: null, loading: data === null, refreshing: data !== null };
    });
    try {
      const data = await withRequestTimeout(load());
      if (request === generation.current) setSnapshot({ load, data, error: null, loading: false, refreshing: false });
      return request === generation.current ? data : null;
    } catch (error) {
      if (request === generation.current) setSnapshot(previous => ({ load, data: previous?.load === load ? previous.data : null, error: patientErrorMessage(error), loading: false, refreshing: false }));
      return null;
    } finally {
      if (request === generation.current) refreshing.current = false;
    }
  }, [load]);
  useEffect(() => { void reload(); return () => { generation.current += 1; refreshing.current = false; }; }, [reload]);
  const refresh = useCallback(() => reload(true), [reload]);
  const current = snapshot?.load === load ? snapshot : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current?.loading ?? true, refreshing: current?.refreshing ?? false, reload, refresh };
}

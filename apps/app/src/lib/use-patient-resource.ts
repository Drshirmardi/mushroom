"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patientCacheKey, patientErrorMessage, patientSessionData, peekPatientCache, subscribePatientResource } from "./patient-request";
import { accessTokenForSession, useAuthSession } from "@/components/auth/session-gate";
import { withRequestTimeout } from "@sabz-zendegi/api-client";

/** Pass a useCallback loader keyed by session and resource to hide stale private data. */
export function usePatientResource<T>(
  load: (force?: boolean) => Promise<T>,
  initialData?: T | null,
  resource?: string,
  errorMessage = patientErrorMessage,
) {
  const generation = useRef(0);
  const [snapshot, setSnapshot] = useState<{ load: typeof load; data: T | null; error: string | null; loading: boolean; refreshing: boolean } | null>(() =>
    initialData == null ? null : { load, data: initialData, error: null, loading: false, refreshing: false },
  );
  const refreshing = useRef(false);
  const run = useCallback(async (quiet = false, force = false) => {
    if (quiet && refreshing.current) return null;
    refreshing.current = true;
    const request = ++generation.current;
    setSnapshot(previous => {
      const data = previous?.load === load ? previous.data : null;
      return { load, data, error: null, loading: data === null, refreshing: data !== null };
    });
    try {
      const data = await withRequestTimeout(load(force));
      if (request === generation.current) setSnapshot({ load, data, error: null, loading: false, refreshing: false });
      return request === generation.current ? data : null;
    } catch (error) {
      if (request === generation.current) setSnapshot(previous => ({ load, data: previous?.load === load ? previous.data : null, error: errorMessage(error), loading: false, refreshing: false }));
      return null;
    } finally {
      if (request === generation.current) refreshing.current = false;
    }
  }, [load, errorMessage]);
  useEffect(() => {
    const unsubscribe = resource ? subscribePatientResource(resource, () => { void run(); }) : undefined;
    void run();
    return () => {
      unsubscribe?.();
      generation.current += 1;
      refreshing.current = false;
    };
  }, [run, resource]);
  const reload = useCallback((quiet = false) => run(quiet, true), [run]);
  const refresh = useCallback(() => reload(true), [reload]);
  const current = snapshot?.load === load ? snapshot : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current?.loading ?? true, refreshing: current?.refreshing ?? false, reload, refresh };
}

export function useSessionPatientResource<T>(resource: string, load: (token: string, signal: AbortSignal) => Promise<T>, ttlMs = 0, initialData?: T | null, errorMessage?: (error: unknown) => string) {
  const { sessionKey } = useAuthSession();
  const key = patientCacheKey(sessionKey, resource);
  const request = useCallback(
    (force?: boolean) => patientSessionData(key, ttlMs, signal => load(accessTokenForSession(sessionKey), signal), force),
    [key, ttlMs, load, sessionKey],
  );
  return usePatientResource(request, initialData ?? peekPatientCache<T>(key), resource, errorMessage);
}

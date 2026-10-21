"use client";
import { useCallback, useRef } from "react";

async function storageKeyFor(scope: string, identifiers: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(identifiers)));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `patient-command:${scope}:${hash}`;
}

/** Retire only after a successful response, so a later deliberate purchase is a new operation. */
export async function finishOperation(scope: string, identifiers: unknown) {
  const storageKey = await storageKeyFor(scope, identifiers);
  try { sessionStorage.removeItem(storageKey); } catch { /* A known success can still be navigated to without storage. */ }
}

/** Only operation identifiers are persisted; never pass answers, tokens or personal data. */
export function useOperationKey(scope: string) {
  const keys = useRef(new Map<string, string>());
  return useCallback(async (identifiers: unknown) => {
    const storageKey = await storageKeyFor(scope, identifiers);
    let key = keys.current.get(storageKey);
    if (!key) {
      try { key = sessionStorage.getItem(storageKey) ?? undefined; } catch { /* In-memory replay remains available in private mode. */ }
      key ??= crypto.randomUUID();
      keys.current.set(storageKey, key);
      try { sessionStorage.setItem(storageKey, key); } catch { /* Storage is optional. */ }
    }
    return key;
  }, [scope]);
}

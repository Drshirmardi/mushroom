declare global {
  interface Window {
    __MUSHROOM_RUNTIME_CONFIG__?: Readonly<Record<string, string>>;
  }
}

export function runtimePublicUrl(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = window.__MUSHROOM_RUNTIME_CONFIG__?.[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

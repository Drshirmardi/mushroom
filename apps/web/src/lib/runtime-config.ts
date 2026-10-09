declare global { interface Window { __MUSHROOM_RUNTIME_CONFIG__?: Readonly<Record<string, string>>; } }
export function runtimePublicUrl(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = window.__MUSHROOM_RUNTIME_CONFIG__?.[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (process.env.NODE_ENV !== "development") return fallback;

  const url = new URL(fallback);
  url.protocol = window.location.protocol;
  url.hostname = window.location.hostname;
  return url.toString().replace(/\/$/, "");
}

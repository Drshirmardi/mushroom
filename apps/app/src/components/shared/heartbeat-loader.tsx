/** Decorative ECG; the owning region/button supplies the accessible status. */
export function HeartbeatLoader({ className = "", size = "inline" }: { className?: string; size?: "inline" | "screen" }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 120 40" fill="none" className={`heartbeat heartbeat--${size} ${className}`} data-heartbeat={size}>
    <path className="heartbeat__track" d="M2 22h27l7-9 10 23L58 4l10 27 7-9h43" />
    <path className="heartbeat__trace" pathLength="100" d="M2 22h27l7-9 10 23L58 4l10 27 7-9h43" />
  </svg>;
}

export function AppLoading({ label = "در حال اتصال به برنامه…" }: { label?: string }) {
  return <main className="patient-app-shell session-screen" dir="rtl" aria-busy="true" data-app-loading><div role="status" aria-live="polite" className="session-screen__content"><HeartbeatLoader size="screen" /><span className="sr-only">{label}</span></div></main>;
}

export function RefreshIndicator({ label = "در حال به‌روزرسانی…" }: { label?: string }) {
  return <span className="loading-refresh" role="status"><HeartbeatLoader /><span className="sr-only">{label}</span></span>;
}

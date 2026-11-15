"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  AuthSessionManager,
  authSessionKey,
  type Authentication,
  type AuthSessionSnapshot,
} from "@/auth/session";
import { authApiClient, marriageLoginUrl, setAccessTokenProvider } from "@/lib/api";
import { clearPatientRequestCache } from "@/lib/patient-request";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const sessionManager = new AuthSessionManager(authApiClient);
let currentSessionKey: string | null = null;
sessionManager.subscribe(() => {
  const snapshot = sessionManager.getSnapshot();
  const nextKey = snapshot.status === "authenticated" ? authSessionKey(snapshot.authentication) : null;
  if (currentSessionKey !== nextKey) clearPatientRequestCache();
  currentSessionKey = nextKey;
});

/** After API verification, use exactly the same session and guards as web/OTP. */
export function acceptBaleAuthentication(authentication: Authentication): void {
  sessionManager.acceptAuthentication(authentication);
}

export function accessTokenForSession(sessionKey: string): string {
  const snapshot = sessionManager.getSnapshot();
  if (snapshot.status !== "authenticated" || currentSessionKey !== sessionKey) {
    throw new Error("Patient session changed");
  }
  return snapshot.authentication.accessToken;
}
setAccessTokenProvider(async () => {
  const snapshot = await sessionManager.bootstrap();
  return snapshot.status === "authenticated"
    ? snapshot.authentication.accessToken
    : null;
});

interface AuthSessionContextValue {
  authentication: Authentication;
  sessionKey: string;
  logout: () => Promise<boolean>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const SessionSnapshotContext = createContext<AuthSessionSnapshot | null>(null);

function SessionStatus({ status, retry }: { status: "checking" | "anonymous" | "unavailable"; retry: () => void }) {
  const unavailable = status === "unavailable";
  return (
    <main className="patient-app-shell session-screen" data-state={status}>
      <section className="session-screen__content" role={unavailable ? "alert" : "status"} aria-atomic="true" aria-busy={!unavailable}>
        {unavailable ? <>
          <div className="session-screen__illustration" aria-hidden="true"><WifiOff size={28} strokeWidth={1.5} /></div>
          <h1>یه کوچولو به مشکل خوردیم</h1>
          <p>فعلاً نتونستیم اطلاعات حسابت رو بگیریم. یه بار دیگه امتحان کن؛ اگه نشد، اینترنتت رو هم چک کن.</p>
          <Button onClick={retry}><RefreshCw size={18} aria-hidden="true" />دوباره امتحان کنیم</Button>
        </> : <>
          <HeartbeatLoader size="screen" />
          <span className="sr-only">{status === "anonymous" ? "در حال باز کردن صفحهٔ ورود…" : "در حال آماده‌سازی…"}</span>
        </>}
      </section>
    </main>
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    sessionManager.subscribe,
    sessionManager.getSnapshot,
    sessionManager.getSnapshot,
  );

  useEffect(() => {
    // /bale first exchanges signed initData; a pre-existing cookie must not
    // silently authorize a different Bale user.
    if (window.location.pathname !== '/bale') void sessionManager.bootstrap();
  }, []);

  const contextValue = useMemo<AuthSessionContextValue | null>(
    () =>
      snapshot.status === "authenticated"
        ? {
            authentication: snapshot.authentication,
            sessionKey: authSessionKey(snapshot.authentication),
            logout: () => {
              clearPatientRequestCache();
              return sessionManager.logout();
            },
          }
        : null,
    [snapshot],
  );

  return (
    <SessionSnapshotContext.Provider value={snapshot}>
      <AuthSessionContext.Provider value={contextValue}>
        {children}
      </AuthSessionContext.Provider>
    </SessionSnapshotContext.Provider>
  );
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const snapshot = useContext(SessionSnapshotContext);

  useEffect(() => {
    if (snapshot?.status === "anonymous") {
      const target = window.sessionStorage.getItem('mushroom:bale-miniapp') === '1'
        ? '/bale'
        : marriageLoginUrl();
      window.location.replace(target);
    }
  }, [snapshot?.status]);

  if (!snapshot) {
    throw new Error("SessionGate must be used inside SessionProvider");
  }

  if (snapshot.status !== "authenticated") {
    return <SessionStatus status={snapshot.status} retry={() => { void sessionManager.refresh(); }} />;
  }

  return children;
}

export function useAuthSession(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession must be used inside SessionGate");
  }
  return value;
}

export function useOptionalAuthSession(): AuthSessionContextValue | null {
  return useContext(AuthSessionContext);
}

export function useAuthSessionSnapshot() {
  return useContext(SessionSnapshotContext);
}

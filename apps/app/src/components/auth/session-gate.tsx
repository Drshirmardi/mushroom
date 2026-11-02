"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  AuthSessionManager,
  type Authentication,
  type AuthSessionSnapshot,
} from "@/auth/session";
import { authApiClient, marriageLoginUrl, setAccessTokenProvider } from "@/lib/api";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const sessionManager = new AuthSessionManager(authApiClient);
setAccessTokenProvider(async () => {
  const snapshot = await sessionManager.bootstrap();
  return snapshot.status === "authenticated"
    ? snapshot.authentication.accessToken
    : null;
});

interface AuthSessionContextValue {
  authentication: Authentication;
  logout: () => Promise<boolean>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const SessionSnapshotContext = createContext<AuthSessionSnapshot | null>(null);

function SessionStatus({ status, retry }: { status: "checking" | "anonymous" | "unavailable"; retry: () => void }) {
  const unavailable = status === "unavailable";
  return (
    <main className="patient-app-shell session-screen" data-state={status}>
      <section className="session-screen__content" role={unavailable ? "alert" : "status"} aria-atomic="true">
        {unavailable ? <>
          <div className="session-screen__illustration" aria-hidden="true"><WifiOff size={28} strokeWidth={1.5} /></div>
          <h1>یه کوچولو به مشکل خوردیم</h1>
          <p>فعلاً نتونستیم اطلاعات حسابت رو بگیریم. یه بار دیگه امتحان کن؛ اگه نشد، اینترنتت رو هم چک کن.</p>
          <Button onClick={retry}><RefreshCw size={18} aria-hidden="true" />دوباره امتحان کنیم</Button>
        </> : <>
          <div className="session-screen__dots" aria-hidden="true"><span /><span /><span /></div>
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
    void sessionManager.bootstrap();
  }, []);

  const contextValue = useMemo<AuthSessionContextValue | null>(
    () =>
      snapshot.status === "authenticated"
        ? {
            authentication: snapshot.authentication,
            logout: () => sessionManager.logout(),
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
      window.location.replace(marriageLoginUrl());
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

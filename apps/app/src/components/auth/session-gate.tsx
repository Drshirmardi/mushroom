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
import { authApiClient, loginUrl, setAccessTokenProvider } from "@/lib/api";

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
    <div className="flex min-h-screen items-center justify-center bg-[#e8ede8] px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-primary/20" />
        <p className="font-bold text-foreground">
          {status === "anonymous"
            ? "در حال انتقال به صفحه ورود…"
            : unavailable
              ? "ارتباط با سرویس برقرار نشد"
              : "در حال بررسی حساب کاربری…"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {unavailable ? "نشست شما حذف نشده است. اتصال را بررسی کنید و دوباره تلاش کنید." : "لطفاً چند لحظه صبر کنید."}
        </p>
        {unavailable && <button type="button" onClick={retry} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">تلاش دوباره</button>}
      </div>
    </div>
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
      window.location.replace(loginUrl);
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

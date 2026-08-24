"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { AuthSessionManager, type Authentication } from "@/auth/session";
import { apiClient, loginUrl } from "@/lib/api";

const sessionManager = new AuthSessionManager(apiClient);

interface AuthSessionContextValue {
  authentication: Authentication;
  logout: () => Promise<boolean>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function SessionStatus({ redirecting = false }: { redirecting?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8ede8] px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-primary/20" />
        <p className="font-bold text-foreground">
          {redirecting ? "در حال انتقال به صفحه ورود…" : "در حال بررسی حساب کاربری…"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          لطفاً چند لحظه صبر کنید.
        </p>
      </div>
    </div>
  );
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    sessionManager.subscribe,
    sessionManager.getSnapshot,
    sessionManager.getSnapshot,
  );

  useEffect(() => {
    void sessionManager.bootstrap();
  }, []);

  useEffect(() => {
    if (snapshot.status === "anonymous") {
      window.location.replace(loginUrl);
    }
  }, [snapshot.status]);

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

  if (snapshot.status !== "authenticated" || !contextValue) {
    return <SessionStatus redirecting={snapshot.status === "anonymous"} />;
  }

  return (
    <AuthSessionContext.Provider value={contextValue}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession must be used inside SessionGate");
  }
  return value;
}

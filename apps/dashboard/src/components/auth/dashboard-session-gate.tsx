"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

import {
  DashboardSessionManager,
  type Authentication,
} from "@/auth/session";
import {
  authApiClient,
  dashboardLoginUrl,
  patientAppUrl,
  setAccessTokenProvider,
} from "@/lib/api";

const sessionManager = new DashboardSessionManager(authApiClient);
setAccessTokenProvider(async () => {
  const snapshot = await sessionManager.bootstrap();
  return snapshot.status === "authenticated"
    ? snapshot.authentication.accessToken
    : null;
});

interface DashboardSessionContextValue {
  authentication: Authentication;
  logout: () => Promise<boolean>;
}

const DashboardSessionContext = createContext<DashboardSessionContextValue | null>(null);

function SessionStatus({ status }: { status: "checking" | "anonymous" | "forbidden" }) {
  const message =
    status === "checking"
      ? "در حال بررسی دسترسی مدیریتی…"
      : status === "forbidden"
        ? "این حساب به داشبورد دسترسی ندارد؛ در حال انتقال…"
        : "در حال انتقال به صفحه ورود…";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-primary/20" />
        <p className="font-bold text-foreground">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">لطفاً چند لحظه صبر کنید.</p>
      </div>
    </div>
  );
}

export function DashboardSessionGate({ children }: { children: React.ReactNode }) {
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
      window.location.replace(dashboardLoginUrl(window.location.href));
    }
    if (snapshot.status === "forbidden") window.location.replace(patientAppUrl);
  }, [snapshot.status]);

  if (snapshot.status !== "authenticated") {
    return <SessionStatus status={snapshot.status} />;
  }

  const contextValue: DashboardSessionContextValue = {
    authentication: snapshot.authentication,
    logout: () => sessionManager.logout(),
  };

  return (
    <DashboardSessionContext.Provider value={contextValue}>
      {children}
    </DashboardSessionContext.Provider>
  );
}

export function useDashboardSession(): DashboardSessionContextValue {
  const value = useContext(DashboardSessionContext);
  if (!value) throw new Error("useDashboardSession must be used inside DashboardSessionGate");
  return value;
}

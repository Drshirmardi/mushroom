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
export async function getDashboardAccessToken(): Promise<string | null> {
  const snapshot = await sessionManager.bootstrap();
  return snapshot.status === "authenticated"
    ? snapshot.authentication.accessToken
    : null;
}
setAccessTokenProvider(getDashboardAccessToken);

interface DashboardSessionContextValue {
  authentication: Authentication;
  logout: () => Promise<boolean>;
}

const DashboardSessionContext = createContext<DashboardSessionContextValue | null>(null);

function SessionStatus({ status, retry }: { status: "checking" | "anonymous" | "forbidden" | "unavailable"; retry: () => void }) {
  const message =
    status === "checking"
      ? "در حال بررسی دسترسی مدیریتی…"
      : status === "forbidden"
        ? "این حساب به داشبورد دسترسی ندارد؛ در حال انتقال…"
        : status === "unavailable"
          ? "ارتباط با سرویس برقرار نشد"
          : "در حال انتقال به صفحه ورود…";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-primary/20" />
        <p className="font-bold text-foreground">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">{status === "unavailable" ? "نشست شما حذف نشده است. اتصال را بررسی کنید و دوباره تلاش کنید." : "لطفاً چند لحظه صبر کنید."}</p>
        {status === "unavailable" && <button type="button" onClick={retry} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">تلاش دوباره</button>}
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
    return <SessionStatus status={snapshot.status} retry={() => { void sessionManager.refresh(); }} />;
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

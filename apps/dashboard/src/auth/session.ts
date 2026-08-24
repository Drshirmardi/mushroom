import {
  createApiClient,
  DEFAULT_REQUEST_TIMEOUT_MS,
  type components,
  withRequestTimeout,
} from "@sabz-zendegi/api-client";

export type Authentication = components["schemas"]["AuthenticationResponseDto"];
export type Role = Authentication["user"]["roles"][number];

export type AuthSessionSnapshot =
  | { status: "checking"; authentication: null }
  | { status: "authenticated"; authentication: Authentication }
  | { status: "anonymous" | "forbidden"; authentication: null };

type ApiClient = ReturnType<typeof createApiClient>;
type Listener = () => void;

const DASHBOARD_ROLES: ReadonlySet<Role> = new Set(["DOCTOR", "STAFF", "ADMIN"]);
const EXPIRY_SAFETY_WINDOW_MS = 5_000;

export function canAccessDashboard(roles: readonly Role[]): boolean {
  return roles.some((role) => DASHBOARD_ROLES.has(role));
}

export class DashboardSessionManager {
  private snapshot: AuthSessionSnapshot = {
    status: "checking",
    authentication: null,
  };
  private readonly listeners = new Set<Listener>();
  private refreshInFlight: Promise<AuthSessionSnapshot> | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly client: ApiClient,
    private readonly now: () => number = Date.now,
    private readonly refreshTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ) {}

  readonly getSnapshot = () => this.snapshot;

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async bootstrap(): Promise<AuthSessionSnapshot> {
    if (
      this.snapshot.status === "authenticated" &&
      this.now() < this.accessTokenExpiresAt - EXPIRY_SAFETY_WINDOW_MS
    ) {
      return this.snapshot;
    }

    return this.refresh();
  }

  async refresh(): Promise<AuthSessionSnapshot> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = Promise.resolve().then(() => this.performRefresh());
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async logout(): Promise<boolean> {
    const current = await this.bootstrap();
    if (current.status !== "authenticated") return true;

    try {
      const { response } = await this.client.POST("/v1/auth/logout", {
        headers: {
          authorization: `Bearer ${current.authentication.accessToken}`,
        },
      });

      if (!response.ok) return false;

      this.accessTokenExpiresAt = 0;
      this.update({ status: "anonymous", authentication: null });
      return true;
    } catch {
      return false;
    }
  }

  private async performRefresh(): Promise<AuthSessionSnapshot> {
    this.update({ status: "checking", authentication: null });

    try {
      const { data } = await withRequestTimeout(
        this.client.POST("/v1/auth/refresh"),
        this.refreshTimeoutMs,
      );
      if (!data) return this.clear("anonymous");
      if (!canAccessDashboard(data.user.roles)) return this.clear("forbidden");

      this.accessTokenExpiresAt = this.now() + data.expiresIn * 1_000;
      return this.update({ status: "authenticated", authentication: data });
    } catch {
      return this.clear("anonymous");
    }
  }

  private clear(status: "anonymous" | "forbidden"): AuthSessionSnapshot {
    this.accessTokenExpiresAt = 0;
    return this.update({ status, authentication: null });
  }

  private update(snapshot: AuthSessionSnapshot): AuthSessionSnapshot {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
    return snapshot;
  }
}

import {
  createApiClient,
  DEFAULT_REQUEST_TIMEOUT_MS,
  type components,
  withRequestTimeout,
} from "@sabz-zendegi/api-client";

export type Authentication = components["schemas"]["AuthenticationResponseDto"];

export type AuthSessionSnapshot =
  | { status: "checking"; authentication: null }
  | { status: "authenticated"; authentication: Authentication }
  | { status: "anonymous" | "unavailable"; authentication: null };

type ApiClient = ReturnType<typeof createApiClient>;
type Listener = () => void;

const EXPIRY_SAFETY_WINDOW_MS = 5_000;
const REFRESH_RETRY_DELAYS_MS = [250, 750, 1_500];

export class AuthSessionManager {
  private snapshot: AuthSessionSnapshot = {
    status: "checking",
    authentication: null,
  };
  private readonly listeners = new Set<Listener>();
  private refreshInFlight: Promise<AuthSessionSnapshot> | null = null;
  private accessTokenExpiresAt = 0;
  private refreshRetryAfter = 0;

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
      (this.now() < this.accessTokenExpiresAt - EXPIRY_SAFETY_WINDOW_MS
        || this.now() < this.refreshRetryAfter)
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
      this.refreshRetryAfter = 0;
      this.update({ status: "anonymous", authentication: null });
      return true;
    } catch {
      return false;
    }
  }

  private async performRefresh(): Promise<AuthSessionSnapshot> {
    if (this.snapshot.status !== "authenticated") {
      this.update({ status: "checking", authentication: null });
    }

    for (const delay of [...REFRESH_RETRY_DELAYS_MS, null]) {
      try {
        const { data, response } = await withRequestTimeout(
          this.client.POST("/v1/auth/refresh"),
          this.refreshTimeoutMs,
        );
        if (data) {
          this.accessTokenExpiresAt = this.now() + data.expiresIn * 1_000;
          this.refreshRetryAfter = 0;
          return this.update({ status: "authenticated", authentication: data });
        }
        if (response.status === 409 && delay !== null) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        if (response.status === 401) return this.clear();
        return this.unavailable();
      } catch {
        return this.unavailable();
      }
    }

    return this.unavailable();
  }

  private clear(): AuthSessionSnapshot {
    this.accessTokenExpiresAt = 0;
    this.refreshRetryAfter = 0;
    return this.update({ status: "anonymous", authentication: null });
  }

  private unavailable(): AuthSessionSnapshot {
    this.refreshRetryAfter = this.now() + 5_000;
    if (this.snapshot.status === "authenticated") return this.snapshot;
    return this.update({ status: "unavailable", authentication: null });
  }

  private update(snapshot: AuthSessionSnapshot): AuthSessionSnapshot {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
    return snapshot;
  }
}

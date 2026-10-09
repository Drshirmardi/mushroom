import {
    createApiClient,
    DEFAULT_REQUEST_TIMEOUT_MS,
    type components,
    withRequestTimeout,
} from "@sabz-zendegi/api-client";

import { appUrl, dashboardUrl } from "../lib/api";

export type Authentication = components["schemas"]["AuthenticationResponseDto"];

export type WebSessionSnapshot =
    | { status: "checking"; authentication: null }
    | { status: "authenticated"; authentication: Authentication }
    | { status: "anonymous" | "unavailable"; authentication: null };

type ApiClient = ReturnType<typeof createApiClient>;
type Listener = () => void;

const DASHBOARD_ROLES = new Set(["DOCTOR", "STAFF", "ADMIN"]);
const EXPIRY_SAFETY_WINDOW_MS = 5_000;
const REFRESH_RETRY_DELAYS_MS = [250, 750, 1_500];

export function dashboardUrlFor(authentication: Authentication): string {
    return authentication.user.roles.some((role) => DASHBOARD_ROLES.has(role))
        ? dashboardUrl
        : appUrl;
}

export class WebSessionManager {
    private snapshot: WebSessionSnapshot = {
        status: "checking",
        authentication: null,
    };
    private readonly listeners = new Set<Listener>();
    private refreshInFlight: Promise<WebSessionSnapshot> | null = null;
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

    async bootstrap(): Promise<WebSessionSnapshot> {
        if (
            this.snapshot.status === "authenticated"
            && (this.now() < this.accessTokenExpiresAt - EXPIRY_SAFETY_WINDOW_MS
                || this.now() < this.refreshRetryAfter)
        ) {
            return this.snapshot;
        }
        if (this.refreshInFlight) return this.refreshInFlight;

        this.refreshInFlight = this.refresh();
        try {
            return await this.refreshInFlight;
        } finally {
            this.refreshInFlight = null;
        }
    }

    private async refresh(): Promise<WebSessionSnapshot> {
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

    private clear(): WebSessionSnapshot {
        this.accessTokenExpiresAt = 0;
        this.refreshRetryAfter = 0;
        return this.update({ status: "anonymous", authentication: null });
    }

    private unavailable(): WebSessionSnapshot {
        this.refreshRetryAfter = this.now() + 5_000;
        if (this.snapshot.status === "authenticated") return this.snapshot;
        return this.update({ status: "unavailable", authentication: null });
    }

    private update(snapshot: WebSessionSnapshot): WebSessionSnapshot {
        this.snapshot = snapshot;
        this.listeners.forEach((listener) => listener());
        return snapshot;
    }
}

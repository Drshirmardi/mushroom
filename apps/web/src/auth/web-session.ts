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
    | { status: "anonymous"; authentication: null };

type ApiClient = ReturnType<typeof createApiClient>;
type Listener = () => void;

const DASHBOARD_ROLES = new Set(["DOCTOR", "STAFF", "ADMIN"]);

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

    constructor(
        private readonly client: ApiClient,
        private readonly refreshTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ) {}

    readonly getSnapshot = () => this.snapshot;

    readonly subscribe = (listener: Listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    async bootstrap(): Promise<WebSessionSnapshot> {
        if (this.refreshInFlight) return this.refreshInFlight;

        this.refreshInFlight = this.refresh();
        try {
            return await this.refreshInFlight;
        } finally {
            this.refreshInFlight = null;
        }
    }

    private async refresh(): Promise<WebSessionSnapshot> {
        try {
            const { data } = await withRequestTimeout(
                this.client.POST("/v1/auth/refresh"),
                this.refreshTimeoutMs,
            );
            return data
                ? this.update({ status: "authenticated", authentication: data })
                : this.update({ status: "anonymous", authentication: null });
        } catch {
            return this.update({ status: "anonymous", authentication: null });
        }
    }

    private update(snapshot: WebSessionSnapshot): WebSessionSnapshot {
        this.snapshot = snapshot;
        this.listeners.forEach((listener) => listener());
        return snapshot;
    }
}

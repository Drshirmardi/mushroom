import { createApiClient } from "@sabz-zendegi/api-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
export const dashboardUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3002";

const allowedPostLoginOrigins = new Set([
    new URL(appUrl).origin,
    new URL(dashboardUrl).origin,
]);

export function resolvePostLoginUrl(candidate: string | null): string {
    if (!candidate) return appUrl;

    try {
        const url = new URL(candidate);
        return allowedPostLoginOrigins.has(url.origin) ? url.toString() : appUrl;
    } catch {
        return appUrl;
    }
}

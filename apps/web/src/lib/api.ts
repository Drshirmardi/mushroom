import { createApiClient } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });

export const appUrl = runtimePublicUrl("appUrl", "http://localhost:3001");
export const dashboardUrl =
    runtimePublicUrl("dashboardUrl", "http://localhost:3002");

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

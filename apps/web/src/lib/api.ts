import { analyticsFetch, decorateAnalyticsUrl } from '../../../../config/analytics-browser';
import { createApiClient } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");

export const apiClient = createApiClient({ baseUrl: apiBaseUrl, fetch: (input, init) => analyticsFetch(input, init, (nextInput, nextInit) => fetch(nextInput, nextInit), apiBaseUrl, "web") });

export const appUrl = runtimePublicUrl("appUrl", "http://localhost:3001");
export const dashboardUrl =
    runtimePublicUrl("dashboardUrl", "http://localhost:3002");

const allowedPostLoginOrigins = new Set([
    new URL(appUrl).origin,
    new URL(dashboardUrl).origin,
]);

export function resolvePostLoginUrl(candidate: string | null): string {
    if (!candidate) return decorateAnalyticsUrl(appUrl, appUrl);

    try {
        const url = new URL(candidate);
        return allowedPostLoginOrigins.has(url.origin) ? decorateAnalyticsUrl(url.toString(), appUrl) : appUrl;
    } catch {
        return appUrl;
    }
}

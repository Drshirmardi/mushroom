import { createApiClient, createSessionAwareFetch } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

export const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");
const webBaseUrl = runtimePublicUrl("webUrl", "http://localhost:3000");

const sessionTransport = createSessionAwareFetch();
export const sessionFetch = sessionTransport.fetch;

export const authApiClient = createApiClient({ baseUrl: apiBaseUrl });
export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: sessionTransport.fetch,
});
export const setAccessTokenProvider = sessionTransport.setAccessTokenProvider;
export const loginUrl = new URL("/login", webBaseUrl).toString();

export function marriageLoginUrl() { const url = new URL(loginUrl); if (/^\/assessment\/marriage(?:\/|$)/.test(window.location.pathname)) url.searchParams.set('next', window.location.href); return url.toString(); }

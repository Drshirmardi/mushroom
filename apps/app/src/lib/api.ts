import { currentInvitationContext, invitationServiceRoute } from './marriage-context';
import { createApiClient, createSessionAwareFetch } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

export const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");
const webBaseUrl = runtimePublicUrl("webUrl", "http://localhost:3000");

const sessionTransport = createSessionAwareFetch();
export const sessionFetch = sessionTransport.fetch;

export const authApiClient = createApiClient({ baseUrl: apiBaseUrl });
export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: (input, init) => {
    const id = currentInvitationContext();
    if (!id) return sessionTransport.fetch(input,init);
    const request = new Request(input,init);
    if (new URL(request.url).origin === new URL(apiBaseUrl).origin && !new URL(request.url).pathname.startsWith('/v1/auth/')) request.headers.set('X-Marriage-Request-Id',id);
    return sessionTransport.fetch(request);
  },
});
export const setAccessTokenProvider = sessionTransport.setAccessTokenProvider;
export const loginUrl = new URL("/login", webBaseUrl).toString();

export function marriageLoginUrl() { const url = new URL(loginUrl); if (currentInvitationContext() || invitationServiceRoute(window.location.pathname) || /^\/assessment\/marriage(?:\/|$)/.test(window.location.pathname)) url.searchParams.set('next', window.location.href); return url.toString(); }

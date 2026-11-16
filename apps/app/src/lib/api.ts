import { analyticsFetch } from '../../../../config/analytics-browser';
import { currentInvitationContext, invitationServiceRoute } from './marriage-context';
import { isCoupleSelectionRoute } from './couples-flow';
import { createApiClient, createSessionAwareFetch } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

export const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");
const webBaseUrl = runtimePublicUrl("webUrl", "http://localhost:3000");

const sessionTransport = createSessionAwareFetch();
export const sessionFetch: typeof fetch = (input, init) => analyticsFetch(input, init,
  (nextInput, nextInit) => sessionTransport.fetch(nextInput, nextInit), apiBaseUrl, 'app');

export const authApiClient = createApiClient({ baseUrl: apiBaseUrl,
  fetch: (input, init) => analyticsFetch(input, init, (nextInput, nextInit) => fetch(nextInput, nextInit), apiBaseUrl, 'app') });
export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: (input, init) => {
    const id = currentInvitationContext();
    if (!id) return sessionFetch(input,init);
    const request = new Request(input,init);
    if (new URL(request.url).origin === new URL(apiBaseUrl).origin && !new URL(request.url).pathname.startsWith('/v1/auth/')) request.headers.set('X-Marriage-Request-Id',id);
    return sessionFetch(request);
  },
});
export const setAccessTokenProvider = sessionTransport.setAccessTokenProvider;
export const loginUrl = new URL("/login", webBaseUrl).toString();

export function marriageLoginUrl() {
  const url = new URL(loginUrl);
  if (typeof window !== 'undefined' && (
    currentInvitationContext() ||
    invitationServiceRoute(window.location.pathname) ||
    /^\/assessment\/marriage(?:\/|$)/.test(window.location.pathname) ||
    isCoupleSelectionRoute(window.location.pathname, window.location.search)
  )) {
    url.searchParams.set('next', window.location.href);
  }
  return url.toString();
}

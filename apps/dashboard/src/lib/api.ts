import { createApiClient } from "@sabz-zendegi/api-client";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";
const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });
export const patientAppUrl = new URL("/", appBaseUrl).toString();

export function dashboardLoginUrl(returnUrl: string): string {
  const url = new URL("/login", webBaseUrl);
  url.searchParams.set("next", returnUrl);
  return url.toString();
}

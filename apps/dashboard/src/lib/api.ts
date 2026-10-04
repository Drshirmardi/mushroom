import { createApiClient } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

export const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");
const webBaseUrl = runtimePublicUrl("webUrl", "http://localhost:3000");
const appBaseUrl = runtimePublicUrl("appUrl", "http://localhost:3001");

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });
export const patientAppUrl = new URL("/", appBaseUrl).toString();

export function dashboardLoginUrl(returnUrl: string): string {
  const url = new URL("/login", webBaseUrl);
  url.searchParams.set("next", returnUrl);
  return url.toString();
}

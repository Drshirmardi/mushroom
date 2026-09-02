import { createApiClient } from "@sabz-zendegi/api-client";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";
const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });
export const loginUrl = new URL("/login", webBaseUrl).toString();

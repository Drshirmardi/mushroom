import { createApiClient } from "@sabz-zendegi/api-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

import { createApiClient } from "@sabz-zendegi/api-client";
import { runtimePublicUrl } from "./runtime-config";

export const apiBaseUrl = runtimePublicUrl("apiUrl", "http://localhost:3003");
const webBaseUrl = runtimePublicUrl("webUrl", "http://localhost:3000");

export const apiClient = createApiClient({ baseUrl: apiBaseUrl });
export const loginUrl = new URL("/login", webBaseUrl).toString();

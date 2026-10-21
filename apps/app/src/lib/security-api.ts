import { apiClient } from "./api";
import { patientAuthorization as auth, patientData, patientEmpty } from "./patient-request";
// The legacy OpenAPI document incorrectly declares these two numeric query values as Object.
export const listAuthSessions = (token: string, page = 1) => patientData(apiClient.GET("/v1/auth/sessions", { headers: auth(token), params: { query: { page: page as never, limit: 20 as never } } }));
export const revokeAuthSession = (token: string, id: string) => patientEmpty(apiClient.DELETE("/v1/auth/sessions/{id}", { headers: auth(token), params: { path: { id } } }));
export const logoutAllSessions = (token: string) => patientEmpty(apiClient.POST("/v1/auth/logout-all", { headers: auth(token) }));

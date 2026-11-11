import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiBaseUrl, sessionFetch } from "@/lib/api";
import { PATIENT_CATALOG_TTL_MS, patientCacheKey, patientCachedData } from "@/lib/patient-request";

export type HealthObservation = components["schemas"]["HealthObservationResponseDto"];
export type HealthMetric = HealthObservation["metric"];
export type MezajResult = components["schemas"]["MezajResultResponseDto"];
export type NotificationCategory = "FINANCIAL" | "REMINDER" | "TREATMENT" | "CONTENT" | "SYSTEM";
export type PatientNotification = { id: string; category: NotificationCategory; title: string; body: string; readAt: string | null; createdAt: string };
export type NotificationPreference = { category: NotificationCategory; inAppEnabled: boolean };
export type PatientArticle = { id: string; slug: string; title: string; summary: string | null; body: string; category: { id: string; name: string; slug: string }; publishedAt: string | null; cover: { objectKey: string; contentType: string; sizeBytes: number } | null };

export class FollowUpRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "FOLLOW_UP_REQUEST_FAILED"); }
}

const request = async <T>(accessToken: string, path: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await withRequestTimeout(sessionFetch(new URL(path, apiBaseUrl), { ...init, cache: "no-store", headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } }));
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && data !== null) return data as T;
    const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    throw new FollowUpRequestError(response.status, code);
  } catch (error) {
    if (error instanceof FollowUpRequestError) throw error;
    throw new FollowUpRequestError(0);
  }
};

export const listHealthObservations = (accessToken: string, metric?: HealthMetric) => request<{ items: HealthObservation[] }>(accessToken, `/v1/patients/me/health-observations${metric ? `?metric=${metric}` : ""}`);
export const createHealthObservation = (accessToken: string, body: { metric: HealthMetric; value: number; observedAt: string }) => request<HealthObservation>(accessToken, "/v1/patients/me/health-observations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
export const getMezajResult = (accessToken: string) => request<MezajResult>(accessToken, "/v1/patients/me/mezaj");
export const listNotifications = (accessToken: string) => request<{ items: PatientNotification[] }>(accessToken, "/v1/patients/me/notifications");
export const readNotification = (accessToken: string, id: string) => request<{ id: string }>(accessToken, `/v1/patients/me/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
export const readAllNotifications = (accessToken: string) => request<{ ok: true }>(accessToken, "/v1/patients/me/notifications/read-all", { method: "POST" });
export const listNotificationPreferences = (accessToken: string) => request<{ items: NotificationPreference[] }>(accessToken, "/v1/patients/me/notifications/preferences");
export const updateNotificationPreference = (accessToken: string, category: NotificationCategory, inAppEnabled: boolean) => request<NotificationPreference>(accessToken, "/v1/patients/me/notifications/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ category, inAppEnabled }) });
export const listPatientArticles = (accessToken: string) => patientCachedData(patientCacheKey(accessToken, "articles"), PATIENT_CATALOG_TTL_MS, () => request<{ items: PatientArticle[] }>(accessToken, "/v1/patients/me/articles"));
export const getPatientArticle = (accessToken: string, slug: string) => request<PatientArticle>(accessToken, `/v1/patients/me/articles/${encodeURIComponent(slug)}`);

export function followUpErrorMessage(error: unknown, fallback = "دریافت اطلاعات ممکن نشد؛ دوباره تلاش کنید.") {
  if (error instanceof FollowUpRequestError && error.status === 404 && error.code === "MEZAJ_RESULT_NOT_FOUND") return "هنوز نتیجهٔ مزاج برای شما ثبت نشده است.";
  if (error instanceof FollowUpRequestError && (error.status === 401 || error.status === 403)) return "اجازهٔ دسترسی به این اطلاعات را ندارید.";
  return fallback;
}

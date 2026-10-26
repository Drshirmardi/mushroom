import type { components } from "@sabz-zendegi/api-client";
import { apiBaseUrl, sessionFetch } from "@/lib/api";
import { AppointmentApiError, listAdminAppointments, transitionAppointment, type AdminAppointmentStatus } from "@/lib/appointment-api";

export type Visit = {
  id: string; patientId: string; doctorId?: string; status: AdminAppointmentStatus; startsAt: string; endsAt: string;
  patientDisplayName?: string | null; doctorDisplayName?: string; serviceName?: string; visitMode?: string;
  canStart?: boolean; canComplete?: boolean;
};
export const visitLabels: Record<AdminAppointmentStatus, string> = { PENDING: "در انتظار تأیید", CONFIRMED: "تأییدشده", CHECKED_IN: "پذیرش‌شده", QUEUED: "منتظر ویزیت", IN_PROGRESS: "در حال ویزیت", COMPLETED: "ویزیت پایان‌یافته", NO_SHOW: "عدم مراجعه", CANCELLED: "لغوشده" };
export const visitTime = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));

async function request<T>(token: string, path: string, method = "GET"): Promise<T> {
  const response = await sessionFetch(new URL(path, apiBaseUrl), { method, cache: "no-store", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new AppointmentApiError(response.status, value?.code ?? null);
  return value as T;
}

export async function listVisits(token: string, physician: boolean, query: { status?: AdminAppointmentStatus; page?: number; from?: string; to?: string } = {}) {
  if (!physician) return listAdminAppointments(token, { ...query, pageSize: 20 });
  const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: "20" });
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return request<components["schemas"]["AssignedAppointmentPageDto"]>(token, `/v1/clinical/appointments?${params}`);
}

export async function getVisit(token: string, physician: boolean, id: string): Promise<Visit> {
  if (physician) return request<components["schemas"]["AssignedConsultationContextDto"]>(token, `/v1/clinical/appointments/${encodeURIComponent(id)}/consultation-context`);
  const value = await request<components["schemas"]["AdminAppointmentResponseDto"]>(token, `/v1/admin/appointments/${encodeURIComponent(id)}`);
  return { ...value, canStart: ["CHECKED_IN", "QUEUED"].includes(value.status), canComplete: value.status === "IN_PROGRESS" };
}

export async function changeVisit(token: string, physician: boolean, id: string, action: "start" | "complete" | "confirm" | "check-in" | "queue") {
  if (physician) {
    if (action !== "start" && action !== "complete") throw new AppointmentApiError(403);
    return request<components["schemas"]["AssignedConsultationContextDto"]>(token, `/v1/clinical/appointments/${encodeURIComponent(id)}/${action}`, "POST");
  }
  return transitionAppointment(token, id, action);
}

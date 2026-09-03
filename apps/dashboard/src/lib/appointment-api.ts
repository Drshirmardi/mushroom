import { apiBaseUrl } from "@/lib/api";

export type AdminAppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
export type AdminAppointment = { id: string; patientId: string; doctorId: string; doctorServiceId: string; startsAt: string; endsAt: string; status: AdminAppointmentStatus; priceAmount: number; currency: string };
export type AdminAppointmentPage = { items: AdminAppointment[]; page: number; pageSize: number; total: number };
export type AdminQueueEntry = { id: string; queuedAt: string; appointment: AdminAppointment };
export type DashboardAppointmentSummary = { asOf: string; timeZone: string; todayAppointments: number; inPersonAppointments: number; onlineAppointments: number; pendingRequests: number; checkedIn: number; queued: number; inProgress: number; completed: number; averageWaitMinutes: number | null; todayPlan: Array<{ id: string; startsAt: string; endsAt: string; status: AdminAppointmentStatus; visitMode: "IN_PERSON" | "ONLINE" }>; recentAppointmentActivity: Array<{ id: string; type: string; appointmentId: string | null; patientId: string | null; createdAt: string }> };
export class AppointmentApiError extends Error { constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "APPOINTMENT_REQUEST_FAILED"); } }

async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  try { const response = await fetch(new URL(path, apiBaseUrl), { ...init, headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } }); const data: unknown = await response.json().catch(() => null); if (response.ok && data) return data as T; const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null; throw new AppointmentApiError(response.status, code); } catch (error) { if (error instanceof AppointmentApiError) throw error; throw new AppointmentApiError(0); }
}

export function listAdminAppointments(accessToken: string, query: { patientId?: string; status?: AdminAppointmentStatus; from?: string; to?: string } = {}) { const params = new URLSearchParams({ page: "1", pageSize: "100", ...(query.patientId ? { patientId: query.patientId } : {}), ...(query.status ? { status: query.status } : {}), ...(query.from ? { from: query.from } : {}), ...(query.to ? { to: query.to } : {}) }); return request<AdminAppointmentPage>(accessToken, `/v1/admin/appointments?${params}`); }
export function listAdminQueue(accessToken: string) { return request<{ items: AdminQueueEntry[] }>(accessToken, "/v1/admin/appointments/queue"); }
export function loadDashboardAppointmentSummary(accessToken: string) { return request<DashboardAppointmentSummary>(accessToken, "/v1/admin/appointments/dashboard-summary"); }
export function transitionAppointment(accessToken: string, id: string, action: "confirm" | "check-in" | "queue" | "start" | "complete" | "no-show") { return request<AdminAppointment>(accessToken, `/v1/admin/appointments/${encodeURIComponent(id)}/${action}`, { method: "POST" }); }
export function dashboardAppointmentError(error: unknown) { if (!(error instanceof AppointmentApiError) || error.status === 0) return "داده‌های نوبت در دسترس نیست؛ دوباره تلاش کنید."; if (error.status === 401 || error.status === 403) return "اجازهٔ مشاهده یا انجام عملیات نوبت را ندارید."; return "درخواست عملیات نوبت انجام نشد؛ دوباره تلاش کنید."; }

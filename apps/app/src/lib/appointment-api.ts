import { withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiBaseUrl, sessionFetch } from "@/lib/api";

export type PatientAppointment = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorServiceId: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  priceAmount: number;
  currency: string;
  priceCapturedAt: string;
  createdAt: string;
};

export type PatientAppointmentPage = { items: PatientAppointment[]; page: number; pageSize: number; total: number };

export class AppointmentRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "APPOINTMENT_REQUEST_FAILED"); }
}

const request = async <T>(accessToken: string, path: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await withRequestTimeout(sessionFetch(new URL(path, apiBaseUrl), { ...init, cache: "no-store", headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } }));
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && data) return data as T;
    const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    throw new AppointmentRequestError(response.status, code);
  } catch (error) {
    if (error instanceof AppointmentRequestError) throw error;
    throw new AppointmentRequestError(0);
  }
};

export const listPatientAppointments = (accessToken: string) => request<PatientAppointmentPage>(accessToken, "/v1/appointments?page=1&pageSize=100");
export const getPatientAppointment = (accessToken: string, id: string) => request<PatientAppointment>(accessToken, `/v1/appointments/${encodeURIComponent(id)}`);
export const createPatientAppointment = (accessToken: string, body: { doctorServiceId: string; startsAt: string }, idempotencyKey: string) => request<PatientAppointment>(accessToken, "/v1/appointments", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify(body) });
export const cancelPatientAppointment = (accessToken: string, id: string, reason?: string) => request<PatientAppointment>(accessToken, `/v1/appointments/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(reason ? { reason } : {}) });
export const reschedulePatientAppointment = (accessToken: string, id: string, body: { doctorServiceId: string; startsAt: string }) => request<PatientAppointment>(accessToken, `/v1/appointments/${encodeURIComponent(id)}/reschedule`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function appointmentErrorMessage(error: unknown) {
  if (!(error instanceof AppointmentRequestError) || error.status === 0) return "سرویس نوبت‌دهی در دسترس نیست؛ دوباره تلاش کنید.";
  if (error.code === "BOOKING_INELIGIBLE") return "شرایط رزرو شما تغییر کرده است؛ ابتدا مراحل لازم را تکمیل کنید.";
  if (error.code === "APPOINTMENT_SLOT_UNAVAILABLE" || error.code === "APPOINTMENT_SLOT_CONFLICT") return "این زمان دیگر در دسترس نیست؛ زمان دیگری را انتخاب کنید.";
  if (error.code === "APPOINTMENT_CHANGE_NOT_ALLOWED") return "این نوبت دیگر قابل تغییر نیست.";
  return "درخواست نوبت انجام نشد؛ دوباره تلاش کنید.";
}

import { apiBaseUrl } from "@/lib/api";
export type PatientClinicalItem = { encounterId: string; appointmentId: string; completedAt: string; revisionNumber: number; patientSummary: string; publishedAt: string };
export type PatientClinicalList = { items: PatientClinicalItem[] };
export class ClinicalHistoryApiError extends Error { constructor(public readonly status: number) { super("CLINICAL_HISTORY_REQUEST_FAILED"); } }
async function request<T>(token: string, path: string): Promise<T> { try { const response = await fetch(new URL(path, apiBaseUrl), { headers: { authorization: `Bearer ${token}` } }); const data: unknown = await response.json().catch(() => null); if (response.ok && data) return data as T; throw new ClinicalHistoryApiError(response.status); } catch (error) { if (error instanceof ClinicalHistoryApiError) throw error; throw new ClinicalHistoryApiError(0); } }
export const getPatientClinicalHistory = (token: string) => request<PatientClinicalList>(token, "/v1/patients/me/clinical/history");
export const getPatientClinicalTimeline = (token: string) => request<PatientClinicalList>(token, "/v1/patients/me/clinical/timeline");
export const getPatientAppointmentSummary = (token: string, appointmentId: string) => request<PatientClinicalItem>(token, `/v1/patients/me/clinical/appointments/${encodeURIComponent(appointmentId)}/summary`);

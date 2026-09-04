import { apiBaseUrl } from "@/lib/api";

export type PrescriptionItem = { id: string; position: number; medicationName: string; doseText: string | null; frequencyText: string | null; durationText: string | null; instructions: string | null };
export type Prescription = { id: string; patientId: string; currentRevision: number; currentIssuedRevision: number | null; latestIssuedRevision: number | null; revision: { id: string; revisionNumber: number; state: "DRAFT" | "ISSUED" | "VOIDED"; items: PrescriptionItem[] } | null };
export type TreatmentPlanSummary = { id: string; state: "DRAFT" | "ACTIVE" | "COMPLETED"; title: string | null; medications: Array<{ id: string; name: string }>; sessionPlans: Array<{ id: string; position: number; title: string; goals: string[] }>; exercisePlans: Array<{ id: string; title: string }>; nutritionPlans: Array<{ id: string; title: string }> };
export type TreatmentProgress = { treatmentPlanId: string; percentage: number; completedTasks: number; totalTasks: number; timeline: Array<{ id: string; eventType: "TASK_COMPLETED" | "MEDICATION_ADHERENCE_RECORDED"; occurredAt: string }> };
export type PrescriptionItemInput = { medicationName: string; doseText?: string; frequencyText?: string; durationText?: string; instructions?: string };

export class PrescriptionTreatmentApiError extends Error { constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "PRESCRIPTION_TREATMENT_REQUEST_FAILED"); } }

async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { authorization: `Bearer ${accessToken}`, ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers } });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new PrescriptionTreatmentApiError(response.status, body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : null);
    return body as T;
  } catch (error) { if (error instanceof PrescriptionTreatmentApiError) throw error; throw new PrescriptionTreatmentApiError(0); }
}

export const listPrescriptions = (token: string, patientId: string) => request<{ items: Prescription[] }>(token, `/v1/admin/patients/${patientId}/prescriptions`);
export const createPrescription = (token: string, patientId: string, items: PrescriptionItemInput[]) => request<Prescription>(token, `/v1/admin/patients/${patientId}/prescriptions`, { method: "POST", body: JSON.stringify({ expectedRevision: 0, items }) });
export const revisePrescription = (token: string, patientId: string, prescription: Prescription, items: PrescriptionItemInput[], amendmentReasonCategory?: string) => request<Prescription>(token, `/v1/admin/patients/${patientId}/prescriptions/${prescription.id}/revisions`, { method: "POST", body: JSON.stringify({ expectedRevision: prescription.currentRevision, items, ...(amendmentReasonCategory?.trim() ? { amendmentReasonCategory: amendmentReasonCategory.trim() } : {}) }) });
export const issuePrescription = (token: string, patientId: string, prescription: Prescription) => request<Prescription>(token, `/v1/admin/patients/${patientId}/prescriptions/${prescription.id}/issue`, { method: "POST", body: JSON.stringify({ revisionNumber: prescription.currentRevision, expectedRevision: prescription.currentRevision }) });
export const listTreatmentPlans = (token: string, patientId: string) => request<{ items: TreatmentPlanSummary[] }>(token, `/v1/admin/patients/${patientId}/treatment-plans`);
export const getTreatmentProgress = (token: string, patientId: string, planId: string) => request<TreatmentProgress>(token, `/v1/admin/patients/${patientId}/treatment-plans/${planId}/progress`);

import { apiBaseUrl } from "@/lib/api";

export type TreatmentMedication = { id: string; name: string; dosage: string | null; instructions: string | null };
export type TreatmentSessionPlan = { id: string; position: number; title: string; goals: string[]; instructions: string | null; patientInstructions: string | null };
export type ExercisePlan = { id: string; title: string; instructions: string | null };
export type NutritionPlan = { id: string; title: string; instructions: string | null };
export type TreatmentPlan = { id: string; state: "ACTIVE" | "COMPLETED"; title: string | null; medications: TreatmentMedication[]; sessionPlans: TreatmentSessionPlan[]; exercisePlans: ExercisePlan[]; nutritionPlans: NutritionPlan[] };
export type TreatmentTask = { id: string; treatmentPlanId: string; kind: "MEDICATION" | "EXERCISE"; scheduledFor: string; state: "SCHEDULED" | "COMPLETED" | "CANCELLED"; completedAt: string | null };
export type TreatmentProgress = { treatmentPlanId: string; percentage: number; completedTasks: number; totalTasks: number; timeline: Array<{ id: string; eventType: "TASK_COMPLETED" | "MEDICATION_ADHERENCE_RECORDED"; occurredAt: string }> };
export class PatientTreatmentApiError extends Error { constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "PATIENT_TREATMENT_REQUEST_FAILED"); } }

async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> { try { const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { authorization: `Bearer ${accessToken}`, ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers } }); const body: unknown = await response.json().catch(() => null); if (!response.ok) throw new PatientTreatmentApiError(response.status, body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : null); return body as T; } catch (error) { if (error instanceof PatientTreatmentApiError) throw error; throw new PatientTreatmentApiError(0); } }

export const listPatientTreatmentPlans = (token: string) => request<{ items: TreatmentPlan[] }>(token, "/v1/patients/me/treatment-plans");
export const listPatientTreatmentTasks = (token: string) => request<{ items: TreatmentTask[] }>(token, "/v1/patients/me/treatment/tasks");
export const getPatientTreatmentProgress = (token: string, planId: string) => request<TreatmentProgress>(token, `/v1/patients/me/treatment-plans/${planId}/progress`);
export const completePatientTreatmentTask = (token: string, taskId: string) => request<TreatmentTask>(token, `/v1/patients/me/treatment/tasks/${taskId}/complete`, { method: "POST" });
export const recordPatientMedicationAdherence = (token: string, medicationId: string, treatmentTaskId?: string) => request<{ id: string }>(token, `/v1/patients/me/treatment/medications/${medicationId}/adherence`, { method: "POST", headers: { "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(treatmentTaskId ? { treatmentTaskId } : {}) });

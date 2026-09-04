import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type TreatmentMedication = components["schemas"]["TreatmentMedicationResponseDto"];
export type TreatmentSessionPlan = components["schemas"]["TreatmentSessionPlanResponseDto"];
export type ExercisePlan = components["schemas"]["ExercisePlanResponseDto"];
export type NutritionPlan = components["schemas"]["NutritionPlanResponseDto"];
export type TreatmentPlan = components["schemas"]["TreatmentPlanResponseDto"];
export type TreatmentTask = components["schemas"]["TreatmentTaskResponseDto"];
export type TreatmentProgress = components["schemas"]["TreatmentProgressResponseDto"];

export class PatientTreatmentApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "PATIENT_TREATMENT_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new PatientTreatmentApiError(response.status, code);
  } catch (error) {
    if (error instanceof PatientTreatmentApiError) throw error;
    throw new PatientTreatmentApiError(0);
  }
}

export const listPatientTreatmentPlans = (accessToken: string) => dataOrThrow<components["schemas"]["TreatmentPlanListResponseDto"]>(
  apiClient.GET("/v1/patients/me/treatment-plans", { headers: authorization(accessToken) }),
);

export const listPatientTreatmentTasks = (accessToken: string) => dataOrThrow<components["schemas"]["TreatmentTaskListResponseDto"]>(
  apiClient.GET("/v1/patients/me/treatment/tasks", { headers: authorization(accessToken) }),
);

export const getPatientTreatmentProgress = (accessToken: string, planId: string) => dataOrThrow<TreatmentProgress>(
  apiClient.GET("/v1/patients/me/treatment-plans/{planId}/progress", { headers: authorization(accessToken), params: { path: { planId } } }),
);

export const completePatientTreatmentTask = (accessToken: string, taskId: string) => dataOrThrow<TreatmentTask>(
  apiClient.POST("/v1/patients/me/treatment/tasks/{taskId}/complete", { headers: authorization(accessToken), params: { path: { taskId } } }),
);

export const recordPatientMedicationAdherence = (accessToken: string, medicationId: string, treatmentTaskId?: string) => {
  const idempotencyKey = crypto.randomUUID();
  return dataOrThrow<components["schemas"]["MedicationAdherenceResponseDto"]>(
    apiClient.POST("/v1/patients/me/treatment/medications/{medicationId}/adherence", { headers: { ...authorization(accessToken), "Idempotency-Key": idempotencyKey }, params: { header: { "Idempotency-Key": idempotencyKey }, path: { medicationId } }, body: treatmentTaskId ? { treatmentTaskId } : {} }),
  );
};

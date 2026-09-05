import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type PrescriptionItem = components["schemas"]["PrescriptionItemResponseDto"];
export type Prescription = components["schemas"]["PrescriptionResponseDto"];
export type TreatmentPlanSummary = components["schemas"]["TreatmentPlanResponseDto"];
export type TreatmentProgress = components["schemas"]["TreatmentProgressResponseDto"];
export type PrescriptionItemInput = components["schemas"]["PrescriptionItemDto"];

export class PrescriptionTreatmentApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "PRESCRIPTION_TREATMENT_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new PrescriptionTreatmentApiError(response.status, code);
  } catch (error) {
    if (error instanceof PrescriptionTreatmentApiError) throw error;
    throw new PrescriptionTreatmentApiError(0);
  }
}

export const listPrescriptions = (accessToken: string, patientId: string) => dataOrThrow<components["schemas"]["PrescriptionListResponseDto"]>(
  apiClient.GET("/v1/admin/patients/{patientId}/prescriptions", { headers: authorization(accessToken), params: { path: { patientId } } }),
);

export const createPrescription = (accessToken: string, patientId: string, items: PrescriptionItemInput[]) => dataOrThrow<Prescription>(
  apiClient.POST("/v1/admin/patients/{patientId}/prescriptions", { headers: authorization(accessToken), params: { path: { patientId } }, body: { expectedRevision: 0, items } }),
);

export const revisePrescription = (accessToken: string, patientId: string, prescription: Prescription, items: PrescriptionItemInput[], amendmentReasonCategory?: string) => dataOrThrow<Prescription>(
  apiClient.POST("/v1/admin/patients/{patientId}/prescriptions/{prescriptionId}/revisions", { headers: authorization(accessToken), params: { path: { patientId, prescriptionId: prescription.id } }, body: { expectedRevision: prescription.currentRevision, items, ...(amendmentReasonCategory?.trim() ? { amendmentReasonCategory: amendmentReasonCategory.trim() } : {}) } }),
);

export const issuePrescription = (accessToken: string, patientId: string, prescription: Prescription) => dataOrThrow<Prescription>(
  apiClient.POST("/v1/admin/patients/{patientId}/prescriptions/{prescriptionId}/issue", { headers: authorization(accessToken), params: { path: { patientId, prescriptionId: prescription.id } }, body: { revisionNumber: prescription.currentRevision, expectedRevision: prescription.currentRevision } }),
);

export const listTreatmentPlans = (accessToken: string, patientId: string) => dataOrThrow<components["schemas"]["TreatmentPlanListResponseDto"]>(
  apiClient.GET("/v1/admin/patients/{patientId}/treatment-plans", { headers: authorization(accessToken), params: { path: { patientId } } }),
);

export const getTreatmentProgress = (accessToken: string, patientId: string, planId: string) => dataOrThrow<TreatmentProgress>(
  apiClient.GET("/v1/admin/patients/{patientId}/treatment-plans/{planId}/progress", { headers: authorization(accessToken), params: { path: { patientId, planId } } }),
);

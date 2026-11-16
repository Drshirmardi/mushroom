import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient, apiBaseUrl, sessionFetch } from "@/lib/api";

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

export const listPrescriptions = (accessToken: string, patientId: string, cursor?: string) => dataOrThrow<components["schemas"]["PrescriptionListResponseDto"] & { patientDisplayName?: string | null }>(
  apiClient.GET("/v1/admin/patients/{patientId}/prescriptions", { headers: authorization(accessToken), params: { path: { patientId }, query: cursor ? { cursor } : {} } }),
);

export const createPrescription = (accessToken: string, patientId: string, items: PrescriptionItemInput[], context?: { appointmentId?: string; commandId?: string }) => clinicalRequest<Prescription>(accessToken, `/v1/admin/patients/${encodeURIComponent(patientId)}/prescriptions`, { expectedRevision: 0, items, ...context });

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

export async function clinicalRequest<T>(token: string, path: string, body?: unknown, method = "POST"): Promise<T> {
  try {
    const response = await sessionFetch(new URL(path, apiBaseUrl), { method: body === undefined ? "GET" : method, cache: "no-store", headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    const value = await response.json().catch(() => null);
    if (!response.ok || !value) throw new PrescriptionTreatmentApiError(response.status, value?.code ?? null);
    return value as T;
  } catch (error) { if (error instanceof PrescriptionTreatmentApiError) throw error; throw new PrescriptionTreatmentApiError(0); }
}
export const prescriptionHistory = (token: string, patientId: string, id: string, before?: number) => clinicalRequest<{ items: Prescription[]; nextBefore: number | null }>(token, `/v1/admin/patients/${encodeURIComponent(patientId)}/prescriptions/${encodeURIComponent(id)}/revisions${before ? `?before=${before}` : ""}`);
export const createTreatmentPlan = (token: string, patientId: string, body: components["schemas"]["CreateTreatmentPlanDto"] & { commandId?: string }) => clinicalRequest<TreatmentPlanSummary>(token, `/v1/admin/patients/${encodeURIComponent(patientId)}/treatment-plans`, body);
export const activateTreatmentPlan = (token: string, patientId: string, id: string) => clinicalRequest<TreatmentPlanSummary>(token, `/v1/admin/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(id)}`, { state: "ACTIVE" }, "PATCH");
export function prescriptionError(error: unknown) {
  if (error instanceof PrescriptionTreatmentApiError) {
    if (error.status === 403 || error.status === 401) return "دسترسی بالینی این حساب برای بیمار یا اقدام انتخاب‌شده کافی نیست.";
    if (error.status === 409) return "اطلاعات روی سرور تغییر کرده است؛ متن شما حفظ شده. ابتدا آخرین اطلاعات را دریافت کنید.";
    if (error.status === 400 || error.status === 422) return "اطلاعات را بررسی کنید؛ نام و طول متن‌ها یا وضعیت نسخه معتبر نیست.";
  }
  return "ارتباط یا ثبت تأیید نشد؛ متن شما حفظ شده است. دوباره تلاش کنید.";
}

export const replaceTreatmentDraft = (token: string, patientId: string, plan: TreatmentPlanSummary, body: components["schemas"]["CreateTreatmentPlanDto"]) => clinicalRequest<TreatmentPlanSummary>(token, `/v1/admin/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(plan.id)}/draft`, { ...body, expectedUpdatedAt: plan.updatedAt }, "PUT");

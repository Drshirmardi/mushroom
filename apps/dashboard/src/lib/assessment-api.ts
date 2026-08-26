import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type AssessmentVersion = components["schemas"]["AssessmentVersionResponseDto"];
export type AssessmentList = components["schemas"]["AssessmentListResponseDto"];
export type AssessmentPolicy = components["schemas"]["BookingAssessmentPolicyResponseDto"];
export type AssessmentSubmissionList = components["schemas"]["AdminAssessmentSubmissionListResponseDto"];
export type AssessmentSubmission = components["schemas"]["AdminAssessmentSubmissionResponseDto"];
export type CreateAssessmentBody = components["schemas"]["CreateAssessmentDto"];
export type UpdateAssessmentBody = components["schemas"]["UpdateAssessmentDto"];
export type UpdateAssessmentPolicyBody = components["schemas"]["UpdateBookingAssessmentPolicyDto"];

export class AssessmentApiError extends Error {
  constructor(public readonly status: number) {
    super("درخواست ارزیابی با خطا روبه‌رو شد.");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> {
  try {
    const { data, response } = await withRequestTimeout(request);
    if (!data) throw new AssessmentApiError(response.status);
    return data;
  } catch (error) {
    if (error instanceof AssessmentApiError) throw error;
    throw new AssessmentApiError(0);
  }
}

export const listAssessments = (accessToken: string) => dataOrThrow<AssessmentList>(
  apiClient.GET("/v1/admin/assessments", { headers: authorization(accessToken) }),
);

export const getAssessment = (accessToken: string, id: string) => dataOrThrow<AssessmentVersion>(
  apiClient.GET("/v1/admin/assessments/{id}", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const createAssessment = (accessToken: string, body: CreateAssessmentBody) => dataOrThrow<AssessmentVersion>(
  apiClient.POST("/v1/admin/assessments", { headers: authorization(accessToken), body }),
);

export const updateAssessment = (accessToken: string, id: string, body: UpdateAssessmentBody) => dataOrThrow<AssessmentVersion>(
  apiClient.PATCH("/v1/admin/assessments/{id}", { headers: authorization(accessToken), params: { path: { id } }, body }),
);

export const duplicateAssessment = (accessToken: string, id: string) => dataOrThrow<AssessmentVersion>(
  apiClient.POST("/v1/admin/assessments/{id}/duplicate", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const publishAssessment = (accessToken: string, id: string) => dataOrThrow<AssessmentVersion>(
  apiClient.POST("/v1/admin/assessments/{id}/publish", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const archiveAssessment = (accessToken: string, id: string) => dataOrThrow<AssessmentVersion>(
  apiClient.POST("/v1/admin/assessments/{id}/archive", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const getAssessmentPolicy = (accessToken: string) => dataOrThrow<AssessmentPolicy>(
  apiClient.GET("/v1/admin/clinic/patient-policy", { headers: authorization(accessToken) }),
);

export const updateAssessmentPolicy = (accessToken: string, body: UpdateAssessmentPolicyBody) => dataOrThrow<AssessmentPolicy>(
  apiClient.PATCH("/v1/admin/clinic/patient-policy", { headers: authorization(accessToken), body }),
);

export const listAssessmentSubmissions = (
  accessToken: string,
  query: { assessmentVersionId?: string; state?: "IN_PROGRESS" | "COMPLETE" | "INVALIDATED" } = {},
) => dataOrThrow<AssessmentSubmissionList>(
  apiClient.GET("/v1/admin/assessment-submissions", {
    headers: authorization(accessToken),
    params: { query: { ...query, pageSize: 50 } },
  }),
);

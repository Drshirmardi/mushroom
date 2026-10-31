import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type PublishedAssessment = components["schemas"]["PatientAssessmentListItemDto"];
export type AssessmentSubmission = components["schemas"]["PatientAssessmentSubmissionResponseDto"];
export type BookingEligibility = components["schemas"]["PatientBookingEligibilityResponseDto"];
export type SaveAssessmentAnswers = components["schemas"]["SaveAssessmentAnswersDto"];
export type AssessmentQuestionnaire = components["schemas"]["PatientAssessmentQuestionnaireResponseDto"];

export class AssessmentRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "ASSESSMENT_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function expectData<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new AssessmentRequestError(response.status, code);
  } catch (error) {
    if (error instanceof AssessmentRequestError) throw error;
    throw new AssessmentRequestError(0);
  }
}

export const listPublishedAssessments = (accessToken: string) => expectData<components["schemas"]["PatientAssessmentListResponseDto"]>(
  apiClient.GET("/v1/assessments", { headers: authorization(accessToken) }),
);

export const startAssessment = (accessToken: string, assessmentVersionId: string) => expectData<AssessmentSubmission>(
  apiClient.POST("/v1/assessments/{assessmentVersionId}/submissions", { headers: authorization(accessToken), params: { path: { assessmentVersionId } } }),
);

export const getAssessmentSubmission = (accessToken: string, id: string) => expectData<AssessmentSubmission>(
  apiClient.GET("/v1/assessment-submissions/{id}", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const saveAssessmentAnswers = (accessToken: string, id: string, body: SaveAssessmentAnswers) => expectData<AssessmentSubmission>(
  apiClient.PUT("/v1/assessment-submissions/{id}", { headers: authorization(accessToken), params: { path: { id } }, body }),
);

export const submitAssessment = (accessToken: string, id: string, idempotencyKey: string, expectedRevision?: number) => expectData<AssessmentSubmission>(
  apiClient.POST("/v1/assessment-submissions/{id}/submit", { headers: authorization(accessToken), params: { path: { id }, header: { "Idempotency-Key": idempotencyKey } }, body: { expectedRevision } }),
);

export const getAssessmentQuestionnaire = (accessToken: string, id: string) => expectData<AssessmentQuestionnaire>(apiClient.GET("/v1/assessment-submissions/{id}/questionnaire", { headers: authorization(accessToken), params: { path: { id } } }));
export const listAssessmentHistory = (accessToken: string, page = 1) => expectData<components["schemas"]["PatientAssessmentHistoryResponseDto"]>(apiClient.GET("/v1/patients/me/assessment-submissions", { headers: authorization(accessToken), params: { query: { page, pageSize: 20 } } }));
export const getAssessmentGuidance = (accessToken: string, id: string) => expectData<components["schemas"]["PatientAssessmentGuidanceDto"]>(apiClient.GET("/v1/assessment-submissions/{id}/guidance", { headers: authorization(accessToken), params: { path: { id } } }));
export const getAssessmentProvenance = (accessToken: string, id: string) => expectData<components["schemas"]["PatientAssessmentProvenanceResponseDto"]>(apiClient.GET("/v1/assessment-submissions/{id}/provenance", { headers: authorization(accessToken), params: { path: { id } } }));

export const getAssessmentResult = (accessToken: string, id: string) => expectData<AssessmentSubmission>(
  apiClient.GET("/v1/assessment-submissions/{id}/result", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const getBookingEligibility = (accessToken: string) => expectData<BookingEligibility>(
  apiClient.GET("/v1/patients/me/booking-eligibility", { headers: authorization(accessToken) }),
);

export function assessmentErrorMessage(error: unknown) {
  if (!(error instanceof AssessmentRequestError) || error.status === 0) return "سرویس ارزیابی در دسترس نیست؛ دوباره تلاش کنید.";
  if (error.status === 401 || error.status === 403) return "اجازهٔ دسترسی به این ارزیابی را ندارید.";
  if (error.code === "ASSESSMENT_ACCESS_UNAVAILABLE") return "تأیید معتبر یا دسترسی این نسخه در حال حاضر در دسترس نیست؛ برای پیگیری با کلینیک تماس بگیرید.";
  if (error.code === "ASSESSMENT_FOLLOW_UP_REQUIRED") return "یک سؤال تکمیلی لازم است؛ آخرین وضعیت آزمون را دریافت کنید.";
  if (error.code === "ASSESSMENT_ANSWERS_INVALID") return "پاسخ‌های ضروری را کامل و معتبر وارد کنید.";
  if (error.code === "ASSESSMENT_SUBMISSION_IMMUTABLE") return "این ارزیابی قبلاً تکمیل شده و قابل تغییر نیست.";
  if (error.status === 409) return "پاسخ‌ها یا وضعیت آزمون تغییر کرده است. پیش از ادامه، نسخهٔ ذخیره‌شده را دوباره دریافت کنید؛ پاسخ‌های فعلی خودکار جایگزین نمی‌شوند.";
  return "درخواست ارزیابی انجام نشد؛ دوباره تلاش کنید.";
}

export async function getCurrentMezaj(accessToken:string) {
  try{return await expectData<components['schemas']['MezajResultResponseDto']>(apiClient.GET('/v1/patients/me/mezaj',{headers:authorization(accessToken),cache:'no-store'}));}
  catch(error){if(error instanceof AssessmentRequestError&&error.status===404)return null;throw error;}
}

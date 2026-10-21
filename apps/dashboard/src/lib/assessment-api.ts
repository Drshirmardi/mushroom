import { type components, type operations, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type AssessmentVersion = components["schemas"]["AssessmentVersionResponseDto"];
export type AssessmentList = components["schemas"]["AssessmentListResponseDto"];
export type AssessmentPolicy = components["schemas"]["BookingAssessmentPolicyResponseDto"];
export type EntryPolicy = components["schemas"]["EntryPolicyDto"];
export const getEntryPolicy = (token: string) => dataOrThrow<EntryPolicy>(apiClient.GET('/v1/admin/assessment-entry-policy', { headers: authorization(token), cache: 'no-store' }));
export const saveEntryPolicy = (token: string, body: components['schemas']['EntryPolicyUpdateDto']) => dataOrThrow<EntryPolicy>(apiClient.PUT('/v1/admin/assessment-entry-policy', { headers: authorization(token), body }));
export type AssessmentSubmissionList = components["schemas"]["AdminAssessmentSubmissionListResponseDto"];
export type AssessmentSubmission = components["schemas"]["AdminAssessmentSubmissionResponseDto"];
export type CreateAssessmentBody = components["schemas"]["CreateAssessmentDto"];
export type UpdateAssessmentBody = components["schemas"]["UpdateAssessmentDto"];
export type UpdateAssessmentPolicyBody = components["schemas"]["UpdateBookingAssessmentPolicyDto"];

export class AssessmentApiError extends Error {
  constructor(public readonly status: number, public readonly code = "") {
    super("درخواست ارزیابی با خطا روبه‌رو شد.");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (!response.ok || data === undefined) throw new AssessmentApiError(response.status, error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "");
    return data;
  } catch (error) {
    if (error instanceof AssessmentApiError) throw error;
    throw new AssessmentApiError(0);
  }
}

export const listAssessments = (accessToken: string, query: NonNullable<operations["adminAssessmentsList"]["parameters"]["query"]> = {}) => dataOrThrow<AssessmentList>(
  apiClient.GET("/v1/admin/assessments", { headers: authorization(accessToken), params: { query } }),
);

export const getAssessment = (accessToken: string, id: string) => dataOrThrow<AssessmentVersion>(
  apiClient.GET("/v1/admin/assessments/{id}", { headers: authorization(accessToken), params: { path: { id } } }),
);

export const deleteAssessment = (accessToken: string, id: string, expectedContentHash: string) => dataOrThrow<components["schemas"]["DeletedAssessmentDto"]>(
  apiClient.DELETE("/v1/admin/assessments/{id}", { headers: authorization(accessToken), params: { path: { id }, query: { expectedContentHash } } }),
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
  query: { assessmentVersionId?: string; state?: "IN_PROGRESS" | "COMPLETE" | "INVALIDATED"; patientId?: string; page?: number; pageSize?: number } = {},
) => dataOrThrow<AssessmentSubmissionList>(
  apiClient.GET("/v1/admin/assessment-submissions", {
    headers: authorization(accessToken),
    params: { query: { ...query, pageSize: query.pageSize ?? 50 } },
  }),
);

export const getAssessmentSubmission = (token: string, id: string) => dataOrThrow<AssessmentSubmission>(apiClient.GET("/v1/admin/assessment-submissions/{id}", { headers: authorization(token), params: { path: { id } } }));
export const getMizajDraftPreset = (token: string) => dataOrThrow<components["schemas"]["AssessmentDraftPresetDto"]>(apiClient.GET("/v1/admin/assessments/draft-presets/mizaj", { headers: authorization(token) }));
export const previewAssessmentScoring = (token: string, id: string, body: components["schemas"]["AssessmentScoringPreviewInputDto"]) => dataOrThrow<components["schemas"]["AssessmentScoringPreviewDto"]>(apiClient.POST("/v1/admin/assessments/{id}/scoring-preview", { headers: authorization(token), params: { path: { id } }, body }));

export function assessmentErrorMessage(error: unknown) {
  if (!(error instanceof AssessmentApiError) || error.status === 0) return "ارتباط با سرور برقرار نشد یا نتیجهٔ درخواست نرسید؛ ورودی‌ها حفظ شده‌اند. پیش از تکرار، وضعیت را بازخوانی کنید.";
  if ([401, 403].includes(error.status)) return "مجوز انجام این عملیات را ندارید یا نشست تمدید نشد.";
  if (error.status === 404) return "نسخه یا مرجع انتخاب‌شده در دسترس نیست.";
  if (["ASSESSMENT_DELETE_NOT_DRAFT", "ASSESSMENT_DELETE_NOT_ALLOWED"].includes(error.code)) return "فقط پیش‌نویس و آزمون بایگانی‌شده قابل حذف‌اند؛ ابتدا نسخهٔ منتشرشده را بایگانی کنید.";
  if (error.code === "ASSESSMENT_DELETE_REFERENCED") return "این آزمون به پاسخ‌ها، نتایج یا اطلاعات دیگری متصل است و قابل حذف نیست؛ سوابق و وابستگی‌ها باید حفظ شوند.";
  if (error.code === "ASSESSMENT_DELETE_CONFLICT") return "آزمون پس از دریافت فهرست تغییر کرده است؛ فهرست را بازخوانی و سپس دربارهٔ حذف تصمیم بگیرید.";
  if (error.code === "ASSESSMENT_PREVIEW_CONFLICT") return "پیش‌نویس تغییر کرده است؛ نسخهٔ تازه را بازخوانی و دوباره پیش‌نمایش بگیرید.";
  if (error.code === "ASSESSMENT_STRUCTURE_INVALID") return "ساختار سؤال‌ها، نگاشت پاسخ‌ها یا نتیجه‌ها کامل نیست. برای انتشار ۱۱+۱، هر شش حالت رفع تساوی دو گرایش باید سؤال و پاسخ کامل داشته باشند.";
  if (error.status === 409) return "نسخه، وضعیت یا مرجع روی سرور تغییر کرده است؛ بازخوانی کنید. نسخهٔ منتشرشده و نسخهٔ متصل به سیاست رزرو محدودیت تغییر دارند.";
  if ([400, 422].includes(error.status)) return "اطلاعات یا مراجع کامل و معتبر نیستند؛ فیلدها و موانع اعلام‌شده را بررسی کنید.";
  return "درخواست انجام نشد؛ اطلاعات حفظ شده‌اند. دوباره تلاش کنید.";
}

export type Offering = components["schemas"]["AssessmentOfferingVersionResponseDto"];
export type OfferingBody = components["schemas"]["CreateAssessmentOfferingVersionDto"];
export type Publication = components["schemas"]["PublicationRecordDto"];
export type PublicationPreview = components["schemas"]["PublicationPreviewDto"];
export type GuidanceMapping = components["schemas"]["AssessmentGuidanceResponseDto"];
export type CoupleProtocol = components["schemas"]["CoupleResultProtocolDto"];
export const listAssessmentOfferings = (token: string, page = 1) => dataOrThrow<components["schemas"]["AssessmentOfferingPageResponseDto"]>(apiClient.GET("/v1/admin/assessment-offerings", { headers: authorization(token), params: { query: { page, pageSize: 20 } } }));
export const createAssessmentOffering = (token: string, body: OfferingBody, key: string) => dataOrThrow<Offering>(apiClient.POST("/v1/admin/assessment-offerings/versions", { headers: authorization(token), params: { header: { "Idempotency-Key": key } }, body }));
export const retireAssessmentOffering = (token: string, id: string) => dataOrThrow<Offering>(apiClient.POST("/v1/admin/assessment-offerings/{id}/retire", { headers: authorization(token), params: { path: { id } } }));
export const getAssessmentOffering = (token: string, id: string) => dataOrThrow<Offering>(apiClient.GET("/v1/admin/assessment-offerings/{id}", { headers: authorization(token), params: { path: { id } } }));
export const previewAssessmentPublication = (token: string, offeringVersionId: string, termsPolicyVersionId: string) => dataOrThrow<PublicationPreview>(apiClient.GET("/v1/admin/assessment-commercial-publications/preview", { headers: authorization(token), params: { query: { offeringVersionId, termsPolicyVersionId } } }));
export const publishAssessmentOffering = (token: string, body: components["schemas"]["PublishAssessmentOfferingDto"], key: string) => dataOrThrow<Publication>(apiClient.POST("/v1/admin/assessment-commercial-publications", { headers: authorization(token), params: { header: { "Idempotency-Key": key } }, body }));
export const listAssessmentPublications = (token: string, page = 1) => dataOrThrow<components["schemas"]["PublicationPageDto"]>(apiClient.GET("/v1/admin/assessment-commercial-publications", { headers: authorization(token), params: { query: { page, pageSize: 20 } } }));
export const getAssessmentPublication = (token: string, id: string) => dataOrThrow<components["schemas"]["PublicationDetailDto"]>(apiClient.GET("/v1/admin/assessment-commercial-publications/{id}", { headers: authorization(token), params: { path: { id } } }));
export const retireAssessmentPublication = (token: string, id: string) => dataOrThrow<Publication>(apiClient.POST("/v1/admin/assessment-commercial-publications/{id}/retire", { headers: authorization(token), params: { path: { id } } }));
export const getAssessmentProtocol = (token: string, assessmentVersionId: string, consentPolicyVersionId?: string) => dataOrThrow<components["schemas"]["ProtocolPreviewResponseDto"]>(apiClient.GET("/v1/admin/assessment-protocols/{assessmentVersionId}", { headers: authorization(token), params: { path: { assessmentVersionId }, query: { consentPolicyVersionId } } }));
export const getAssessmentProtocolHistory = (token: string, assessmentVersionId: string, page = 1) => dataOrThrow<components["schemas"]["ProtocolReviewPageDto"]>(apiClient.GET("/v1/admin/assessment-protocols/{assessmentVersionId}/reviews", { headers: authorization(token), params: { path: { assessmentVersionId }, query: { page, pageSize: 20 } } }));
export const listAssessmentGuidance = (token: string, assessmentVersionId: string, page = 1) => dataOrThrow<components["schemas"]["AssessmentGuidancePageDto"]>(apiClient.GET("/v1/admin/assessment-guidance", { headers: authorization(token), params: { query: { assessmentVersionId, page, pageSize: 20 } } }));
export const createAssessmentGuidance = (token: string, body: components["schemas"]["AssessmentGuidanceCreateDto"], key: string) => dataOrThrow<GuidanceMapping>(apiClient.POST("/v1/admin/assessment-guidance/versions", { headers: authorization(token), params: { header: { "Idempotency-Key": key } }, body }));
export const revokeAssessmentGuidance = (token: string, id: string) => dataOrThrow<GuidanceMapping>(apiClient.POST("/v1/admin/assessment-guidance/{id}/revoke", { headers: authorization(token), params: { path: { id } } }));
export const getAssessmentGuidance = (token: string, id: string) => dataOrThrow<GuidanceMapping>(apiClient.GET("/v1/admin/assessment-guidance/{id}", { headers: authorization(token), params: { path: { id } } }));
export const listCoupleProtocols = (token: string, assessmentVersionId: string, page = 1) => dataOrThrow<components["schemas"]["CoupleResultProtocolPageDto"]>(apiClient.GET("/v1/admin/couple-result-protocols", { headers: authorization(token), params: { query: { assessmentVersionId, page, pageSize: 20 } } }));
export const createCoupleProtocol = (token: string, body: components["schemas"]["CoupleResultProtocolCreateDto"], key: string) => dataOrThrow<CoupleProtocol>(apiClient.POST("/v1/admin/couple-result-protocols/versions", { headers: authorization(token), params: { header: { "Idempotency-Key": key } }, body }));
export const getCoupleProtocol = (token: string, id: string) => dataOrThrow<CoupleProtocol>(apiClient.GET("/v1/admin/couple-result-protocols/{id}", { headers: authorization(token), params: { path: { id } } }));
export const revokeCoupleProtocol = (token: string, id: string) => dataOrThrow<CoupleProtocol>(apiClient.POST("/v1/admin/couple-result-protocols/{id}/revoke", { headers: authorization(token), params: { path: { id } } }));
export const listGuidanceContent = (token: string, page = 1) => dataOrThrow<components["schemas"]["GuidanceContentPageDto"]>(apiClient.GET("/v1/admin/guidance-content", { headers: authorization(token), params: { query: { page, pageSize: 50 } } }));
export const listAssessmentServices = (token: string, page = 1) => dataOrThrow<components["schemas"]["DirectoryPageResponseDto"]>(apiClient.GET("/v1/admin/services", { headers: authorization(token), params: { query: { page, pageSize: 20, isActive: true, publicationStatus: "PUBLISHED" } } }));

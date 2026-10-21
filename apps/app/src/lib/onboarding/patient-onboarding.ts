import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "../api";

type Client = typeof apiClient;

export type SelfProfile = components["schemas"]["SelfProfileResponseDto"];
export type OnboardingStatus = components["schemas"]["OnboardingStatusResponseDto"];
export type ConsentPolicy = components["schemas"]["ConsentPolicyResponseDto"];
export type MedicalIntake = components["schemas"]["MedicalIntakeResponseDto"];
export type IntakeSnapshot = components["schemas"]["IntakeSnapshotDto"];
export type SaveIntakeDraft = components["schemas"]["SaveIntakeDraftDto"];

const authorizationHeaders = (accessToken: string) => ({
  authorization: `Bearer ${accessToken}`,
});

const idempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export class PatientOnboardingRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(code ?? "REQUEST_FAILED");
  }
}

async function expectData<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : null;
    throw new PatientOnboardingRequestError(response.status, code);
  } catch (error) {
    if (error instanceof PatientOnboardingRequestError) throw error;
    throw new PatientOnboardingRequestError(0, null);
  }
}

export function loadSelfProfile(accessToken: string, client: Client = apiClient) {
  return expectData(client.GET("/v1/patients/me", { headers: authorizationHeaders(accessToken) }));
}

export function loadOnboardingStatus(accessToken: string, client: Client = apiClient) {
  return expectData(client.GET("/v1/patients/me/onboarding-status", { headers: authorizationHeaders(accessToken) }));
}

export function loadConsentPolicy(accessToken: string, client: Client = apiClient) {
  return expectData(client.GET("/v1/patients/me/consent-policy", { headers: authorizationHeaders(accessToken) }));
}

export function loadMedicalIntake(accessToken: string, client: Client = apiClient) {
  return expectData(client.GET("/v1/patients/me/medical-intake", { headers: authorizationHeaders(accessToken) }));
}

export async function loadPatientOnboarding(accessToken: string, client: Client = apiClient) {
  const headers = authorizationHeaders(accessToken);
  const [profile, status, policy, intake] = await Promise.all([
    expectData(client.GET("/v1/patients/me", { headers })),
    expectData(client.GET("/v1/patients/me/onboarding-status", { headers })),
    expectData(client.GET("/v1/patients/me/consent-policy", { headers })),
    expectData(client.GET("/v1/patients/me/medical-intake", { headers })),
  ]);
  return { profile, status, policy, intake };
}

export function updateSelfProfile(
  accessToken: string,
  body: Omit<components["schemas"]["UpdateSelfProfileDto"], "gender"> & { gender?: "FEMALE" | "MALE" | "" | null },
  client: Client = apiClient,
) {
  const optionalText = (value: string | null | undefined) =>
    typeof value === "string" && value.trim() === "" ? null : value;
  const normalizedBody: components["schemas"]["UpdateSelfProfileDto"] = {
    ...body,
    email: optionalText(body.email),
    cityName: optionalText(body.cityName),
    gender: body.gender === "" ? null : body.gender,
  };
  return expectData(client.PATCH("/v1/patients/me", {
    headers: authorizationHeaders(accessToken),
    body: normalizedBody,
  }));
}

export function acceptConsent(
  accessToken: string,
  policy: ConsentPolicy,
  client: Client = apiClient,
) {
  return expectData(client.POST("/v1/patients/me/consents", {
    headers: authorizationHeaders(accessToken),
    params: { header: { "Idempotency-Key": idempotencyKey() } },
    body: { policyVersionId: policy.id, contentHash: policy.contentHash },
  }));
}

export function withdrawConsent(
  accessToken: string,
  consentRecordId: string,
  client: Client = apiClient,
) {
  return expectData(client.POST("/v1/patients/me/consents/{consentRecordId}/withdraw", {
    params: { path: { consentRecordId }, header: { "Idempotency-Key": idempotencyKey() } },
    headers: authorizationHeaders(accessToken),
  }));
}

export function saveMedicalIntake(
  accessToken: string,
  body: SaveIntakeDraft,
  client: Client = apiClient,
) {
  return expectData(client.PUT("/v1/patients/me/medical-intake", {
    headers: authorizationHeaders(accessToken),
    body,
  }));
}

export function completeMedicalIntake(
  accessToken: string,
  expectedRevision: number,
  client: Client = apiClient,
) {
  return expectData(client.POST("/v1/patients/me/medical-intake/complete", {
    headers: authorizationHeaders(accessToken),
    params: { header: { "Idempotency-Key": idempotencyKey() } },
    body: { expectedRevision },
  }));
}

export function onboardingErrorMessage(error: unknown, operation: "load" | "save" = "save") {
  if (!(error instanceof PatientOnboardingRequestError)) {
    return "ارتباط با سرویس برقرار نشد؛ دوباره تلاش کنید.";
  }
  if (error.status === 0) return "ارتباط با سرویس برقرار نشد؛ دوباره تلاش کنید.";
  if (error.code === "CONSENT_REQUIRED") return "برای ذخیره اطلاعات پزشکی، رضایت فعال لازم است.";
  if (error.status === 401 || error.status === 403) {
    return "دسترسی به پرونده شما مجاز نیست. لطفاً دوباره وارد حساب شوید.";
  }
  if (error.code === "PROFILE_FIELDS_INCOMPLETE") return "نام و نام خانوادگی را کامل کنید.";
  if (error.code === "INVALID_MEDICAL_DECLARATION") return "پاسخ‌های پزشکی را کامل و معتبر وارد کنید.";
  if (error.code === "BAD_REQUEST" || error.code === "UNPROCESSABLE_ENTITY") return "مقدار یکی از فیلدها معتبر نیست؛ موارد مشخص‌شده را بررسی کنید.";
  if (error.code === "MEDICAL_INTAKE_REVISION_CONFLICT") return "اطلاعات در دستگاه دیگری تغییر کرده است؛ صفحه را تازه کنید.";
  if (error.code === "MEDICAL_INTAKE_INCOMPLETE") return "همه پاسخ‌های ضروری را تکمیل کنید.";
  if (error.code === "CONSENT_POLICY_STALE") return "نسخه رضایت تغییر کرده است؛ متن جدید را بررسی کنید.";
  if (error.code === "CONSENT_POLICY_NOT_AVAILABLE") return "رضایت‌نامه هنوز برای این محیط منتشر نشده است؛ کمی بعد دوباره تلاش کنید.";
  if (error.code === "SERVICE_UNAVAILABLE") return "سرویس پرونده اولیه موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.";
  return operation === "load"
    ? "دریافت اطلاعات انجام نشد؛ دوباره تلاش کنید."
    : "ذخیره‌سازی انجام نشد؛ دوباره تلاش کنید.";
}

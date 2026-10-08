import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@sabz-zendegi/api-client";

import { loadConsentPolicy, loadSelfProfile, onboardingErrorMessage, PatientOnboardingRequestError, updateSelfProfile } from "./patient-onboarding";

describe("patient onboarding request errors", () => {
  it("does not misrepresent authorization failures as an empty profile", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(403, "FORBIDDEN"))).toContain("دسترسی");
  });

  it("explains missing consent before the generic forbidden response", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(403, "CONSENT_REQUIRED"))).toContain("رضایت");
  });

  it("guides a stale revision to refresh instead of overwriting it", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(409, "MEDICAL_INTAKE_REVISION_CONFLICT"))).toContain("تازه");
  });

  it("identifies incomplete required profile fields", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(422, "PROFILE_FIELDS_INCOMPLETE"))).toContain("نام و نام خانوادگی");
  });

  it("identifies invalid medical declarations", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(422, "INVALID_MEDICAL_DECLARATION"))).toContain("پزشکی");
  });

  it("sends blank optional profile values as null", async () => {
    const patch = vi.fn().mockResolvedValue({
      data: { phone: "+989121234567" },
      response: new Response(null, { status: 200 }),
    });

    await updateSelfProfile("access-token", {
      firstName: "مینا",
      lastName: "احمدی",
      email: "",
      cityName: "   ",
    }, { PATCH: patch } as never);

    expect(patch).toHaveBeenCalledWith("/v1/patients/me", expect.objectContaining({
      body: expect.objectContaining({ email: null, cityName: null }),
    }));
  });

  it("explains generic validation responses", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(400, "BAD_REQUEST"))).toContain("معتبر نیست");
  });

  it("uses the parsed openapi error after the response body has been consumed", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      fetch: vi.fn(async () => new Response(JSON.stringify({
        code: "CONSENT_POLICY_NOT_AVAILABLE",
        message: "No current consent policy is available.",
        details: {},
      }), { status: 503, headers: { "content-type": "application/json" } })),
    });

    await expect(loadConsentPolicy("access-token", client)).rejects.toMatchObject({
      status: 503,
      code: "CONSENT_POLICY_NOT_AVAILABLE",
    });
  });

  it("loads a profile without requesting consent or medical-intake resources", async () => {
    const get = vi.fn().mockResolvedValue({
      data: { patientId: "patient-1", phone: "+989121234567", accountStatus: "ACTIVE" },
      response: new Response(null, { status: 200 }),
    });

    await loadSelfProfile("access-token", { GET: get } as never);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/v1/patients/me", expect.any(Object));
  });

  it("uses read-specific wording for an unrecognized load failure", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(500, "INTERNAL_SERVER_ERROR"), "load"))
      .toContain("دریافت اطلاعات");
  });
});

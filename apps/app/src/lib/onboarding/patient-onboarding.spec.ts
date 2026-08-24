import { describe, expect, it } from "vitest";

import { onboardingErrorMessage, PatientOnboardingRequestError } from "./patient-onboarding";

describe("patient onboarding request errors", () => {
  it("does not misrepresent authorization failures as an empty profile", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(403, "FORBIDDEN"))).toContain("دسترسی");
  });

  it("guides a stale revision to refresh instead of overwriting it", () => {
    expect(onboardingErrorMessage(new PatientOnboardingRequestError(409, "MEDICAL_INTAKE_REVISION_CONFLICT"))).toContain("تازه");
  });
});

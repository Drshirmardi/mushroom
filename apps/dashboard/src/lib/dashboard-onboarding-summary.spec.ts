import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { loadDashboardOnboardingSummary } from "./dashboard-onboarding-summary";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("dashboard onboarding summary", () => {
  it("uses the generated client with the in-memory bearer token", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse(
        {
          asOf: "2026-08-24T19:00:00.000Z",
          timeZone: "Asia/Tehran",
          newPatientsToday: 2,
          onboardingCompletePatients: 5,
          onboardingIncompletePatients: 3,
        },
        200,
      ),
    );

    const result = await loadDashboardOnboardingSummary(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      "access-token",
    );

    expect(result).toMatchObject({ status: "ready" });
    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://api.example.test/v1/admin/patients/onboarding-summary");
    expect(request.headers.get("authorization")).toBe("Bearer access-token");
  });

  it.each([401, 403])("exposes %i responses as an unauthorized state", async (status) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse({}, status));
    const result = await loadDashboardOnboardingSummary(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      "access-token",
    );

    expect(result).toEqual({ status: "unauthorized" });
  });

  it("does not invent values when the service fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error("offline"));
    const result = await loadDashboardOnboardingSummary(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      "access-token",
    );

    expect(result).toEqual({ status: "error" });
  });
});

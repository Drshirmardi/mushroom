import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AssessmentApiError,
  archiveAssessment,
  createAssessment,
  duplicateAssessment,
  getAssessmentPolicy,
  listAssessmentSubmissions,
  listAssessments,
  publishAssessment,
  updateAssessment,
  updateAssessmentPolicy,
} from "./assessment-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }),
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const version = {
  id: "00000000-0000-4000-8000-000000000001",
  assessmentKey: "MAIN",
  versionNumber: 1,
  locale: "fa-IR" as const,
  title: "ارزیابی اصلی",
  structure: { schemaVersion: 1, sections: [] },
  contentHash: "a".repeat(64),
  status: "DRAFT" as const,
  publishedAt: null,
  retiredAt: null,
  publishedByUserId: null,
  createdAt: "2026-08-26T00:00:00.000Z",
  updatedAt: "2026-08-26T00:00:00.000Z",
};

describe("dashboard assessment API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("uses generated request bodies and bearer authentication for lifecycle writes", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(version)));
    const structure = { schemaVersion: 1, sections: [] };

    await createAssessment("token", { title: "ارزیابی اصلی", structure });
    await updateAssessment("token", version.id, { title: "نسخه ویرایش‌شده", structure });
    await duplicateAssessment("token", version.id);
    await publishAssessment("token", version.id);
    await archiveAssessment("token", version.id);

    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ["POST", "https://api.example.test/v1/admin/assessments"],
      ["PATCH", `https://api.example.test/v1/admin/assessments/${version.id}`],
      ["POST", `https://api.example.test/v1/admin/assessments/${version.id}/duplicate`],
      ["POST", `https://api.example.test/v1/admin/assessments/${version.id}/publish`],
      ["POST", `https://api.example.test/v1/admin/assessments/${version.id}/archive`],
    ]);
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
    await expect(requests[0].json()).resolves.toEqual({ title: "ارزیابی اصلی", structure });
  });

  it("loads versions, policy, and filtered immutable submissions", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ items: [version], page: 1, pageSize: 20, total: 1 }))
      .mockResolvedValueOnce(json({ assessmentRequirement: "NOT_REQUIRED", requiredAssessmentVersionId: null, validityDays: null, requireLatestPublishedVersion: false, updatedAt: null }))
      .mockResolvedValueOnce(json({ items: [], page: 1, pageSize: 50, total: 0 }));

    await listAssessments("token");
    await getAssessmentPolicy("token");
    await listAssessmentSubmissions("token", { assessmentVersionId: version.id, state: "COMPLETE" });

    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests[2].url).toBe(`https://api.example.test/v1/admin/assessment-submissions?assessmentVersionId=${version.id}&state=COMPLETE&pageSize=50`);
  });

  it("updates the booking policy with the generated body", async () => {
    fetchMock.mockResolvedValue(json({ assessmentRequirement: "REQUIRED", requiredAssessmentVersionId: version.id, validityDays: null, requireLatestPublishedVersion: false, updatedAt: null }));
    await updateAssessmentPolicy("token", { assessmentRequirement: "REQUIRED", requiredAssessmentVersionId: version.id, validityDays: null, requireLatestPublishedVersion: false });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    await expect(request.json()).resolves.toMatchObject({ assessmentRequirement: "REQUIRED", requiredAssessmentVersionId: version.id });
  });

  it("preserves forbidden and unavailable failures for truthful UI states", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403));
    await expect(listAssessments("token")).rejects.toEqual(expect.objectContaining<Partial<AssessmentApiError>>({ status: 403 }));

    fetchMock.mockRejectedValueOnce(new TypeError("network unavailable"));
    await expect(listAssessments("token")).rejects.toEqual(expect.objectContaining<Partial<AssessmentApiError>>({ status: 0 }));
  });
});

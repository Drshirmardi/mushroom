import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { loadDashboardAssessmentSummary } from "./dashboard-assessment-summary";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const submission = (id: string, completedAt: string | null) => ({ id, patientId: "00000000-0000-4000-8000-000000000001", assessmentVersionId: "00000000-0000-4000-8000-000000000002", assessmentTitle: "ارزیابی اصلی", attemptNumber: 1, state: completedAt ? "COMPLETE" : "IN_PROGRESS", score: null, resultSnapshot: null, startedAt: "2026-08-26T10:00:00.000Z", completedAt });

describe("dashboard assessment summary", () => {
  it("projects real completion, pending, and newest completion activity", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ items: [submission("older", "2026-08-25T10:00:00.000Z"), submission("newer", "2026-08-26T10:00:00.000Z")], page: 1, pageSize: 5, total: 7 }))
      .mockResolvedValueOnce(json({ items: [submission("pending", null)], page: 1, pageSize: 1, total: 3 }));
    const result = await loadDashboardAssessmentSummary(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token");
    expect(result).toMatchObject({ status: "ready", summary: { completed: 7, pending: 3, recentActivity: [{ id: "newer" }, { id: "older" }] } });
    expect((fetch.mock.calls[0]?.[0] as Request).url).toContain("state=COMPLETE&pageSize=5");
    expect((fetch.mock.calls[1]?.[0] as Request).headers.get("authorization")).toBe("Bearer token");
  });

  it("keeps real empty totals without fabricated activity", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ items: [], page: 1, pageSize: 5, total: 0 }))
      .mockResolvedValueOnce(json({ items: [], page: 1, pageSize: 1, total: 0 }));
    await expect(loadDashboardAssessmentSummary(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: "ready", summary: { completed: 0, pending: 0, recentActivity: [] } });
  });

  it.each([401, 403])("marks %i responses unavailable to this dashboard user", async (status) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(json({}, status)).mockResolvedValueOnce(json({}, status));
    await expect(loadDashboardAssessmentSummary(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: "unauthorized" });
  });

  it("does not invent values when the service is unavailable", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error("offline"));
    await expect(loadDashboardAssessmentSummary(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: "error" });
  });
});

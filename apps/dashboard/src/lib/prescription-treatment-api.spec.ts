import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@sabz-zendegi/api-client";

import { type Prescription, createPrescription, getTreatmentProgress, issuePrescription, listPrescriptions, listTreatmentPlans, revisePrescription } from "./prescription-treatment-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock); vi.mock("@/lib/api", () => ({
  apiBaseUrl: "https://api.example.test",
  apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock as typeof fetch }),
  sessionFetch: (input: RequestInfo | URL, init?: RequestInit) => fetchMock(new Request(input, init)),
}));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const prescription: Prescription = { id: "prescription-1", patientId: "patient-1", currentRevision: 2, currentIssuedRevision: null, latestIssuedRevision: null, revision: { id: "revision-2", revisionNumber: 2, previousRevisionId: null, state: "DRAFT", amendmentReasonCategory: null, integrityHash: null, authoredAt: "2026-09-04T00:00:00.000Z", authoredByUserId: "user-1", issuedAt: null, issuedByUserId: null, items: [] } };

describe("prescription and treatment dashboard API", () => {
  beforeEach(() => fetchMock.mockReset());
  it("uses the selected patient for the prescribed F07 dashboard operations", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [prescription] })).mockResolvedValueOnce(json(prescription)).mockResolvedValueOnce(json(prescription)).mockResolvedValueOnce(json(prescription)).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ treatmentPlanId: "plan-1", percentage: 25, completedTasks: 1, totalTasks: 4, timeline: [] }));
    await listPrescriptions("token", "patient-1"); await createPrescription("token", "patient-1", [{ medicationName: "دارو" }]); await revisePrescription("token", "patient-1", prescription, [{ medicationName: "داروی اصلاح‌شده" }], "اصلاح دوز"); await issuePrescription("token", "patient-1", prescription); await listTreatmentPlans("token", "patient-1"); await getTreatmentProgress("token", "patient-1", "plan-1");
    const requests = fetchMock.mock.calls.map(([request, init]) => ({ request: request as Request, init: init as RequestInit | undefined }));
    expect(requests.map(({ request }) => new URL(request.url).pathname)).toEqual(["/v1/admin/patients/patient-1/prescriptions", "/v1/admin/patients/patient-1/prescriptions", "/v1/admin/patients/patient-1/prescriptions/prescription-1/revisions", "/v1/admin/patients/patient-1/prescriptions/prescription-1/issue", "/v1/admin/patients/patient-1/treatment-plans", "/v1/admin/patients/patient-1/treatment-plans/plan-1/progress"]);
    expect(requests.map(({ request }) => request.method)).toEqual(["GET", "POST", "POST", "POST", "GET", "GET"]);
    expect(requests.every(({ request }) => request.headers.get("authorization") === "Bearer token")).toBe(true);
    await expect(requests[2].request.json()).resolves.toMatchObject({ expectedRevision: 2, amendmentReasonCategory: "اصلاح دوز", items: [{ medicationName: "داروی اصلاح‌شده" }] });
    await expect(requests[3].request.json()).resolves.toEqual({ revisionNumber: 2, expectedRevision: 2 });
  });
  it("keeps request failures explicit instead of providing dashboard data", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403));
    await expect(listPrescriptions("token", "patient-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrescription, getTreatmentProgress, issuePrescription, listPrescriptions, listTreatmentPlans, revisePrescription } from "./prescription-treatment-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock); vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test" }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const prescription = { id: "prescription-1", patientId: "patient-1", currentRevision: 2, currentIssuedRevision: null, latestIssuedRevision: null, revision: { id: "revision-2", revisionNumber: 2, state: "DRAFT" as const, items: [] } };

describe("prescription and treatment dashboard API", () => {
  beforeEach(() => fetchMock.mockReset());
  it("uses the selected patient for the prescribed F07 dashboard operations", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [prescription] })).mockResolvedValueOnce(json(prescription)).mockResolvedValueOnce(json(prescription)).mockResolvedValueOnce(json(prescription)).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ treatmentPlanId: "plan-1", percentage: 25, completedTasks: 1, totalTasks: 4, timeline: [] }));
    await listPrescriptions("token", "patient-1"); await createPrescription("token", "patient-1", [{ medicationName: "دارو" }]); await revisePrescription("token", "patient-1", prescription, [{ medicationName: "داروی اصلاح‌شده" }], "اصلاح دوز"); await issuePrescription("token", "patient-1", prescription); await listTreatmentPlans("token", "patient-1"); await getTreatmentProgress("token", "patient-1", "plan-1");
    const requests = fetchMock.mock.calls.map(([input, init]) => ({ url: input as string, init: init as RequestInit }));
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual(["/v1/admin/patients/patient-1/prescriptions", "/v1/admin/patients/patient-1/prescriptions", "/v1/admin/patients/patient-1/prescriptions/prescription-1/revisions", "/v1/admin/patients/patient-1/prescriptions/prescription-1/issue", "/v1/admin/patients/patient-1/treatment-plans", "/v1/admin/patients/patient-1/treatment-plans/plan-1/progress"]);
    expect(requests.map((request) => request.init.method ?? "GET")).toEqual(["GET", "POST", "POST", "POST", "GET", "GET"]);
    expect(requests.every((request) => (request.init.headers as Record<string, string>).authorization === "Bearer token")).toBe(true);
    expect(JSON.parse(requests[2].init.body as string)).toMatchObject({ expectedRevision: 2, amendmentReasonCategory: "اصلاح دوز", items: [{ medicationName: "داروی اصلاح‌شده" }] });
    expect(JSON.parse(requests[3].init.body as string)).toEqual({ revisionNumber: 2, expectedRevision: 2 });
  });
  it("keeps request failures explicit instead of providing dashboard data", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403));
    await expect(listPrescriptions("token", "patient-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

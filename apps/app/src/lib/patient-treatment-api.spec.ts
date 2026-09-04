import { beforeEach, describe, expect, it, vi } from "vitest";
import { completePatientTreatmentTask, getPatientTreatmentProgress, listPatientTreatmentPlans, listPatientTreatmentTasks, recordPatientMedicationAdherence } from "./patient-treatment-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock); vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test" }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("patient treatment API", () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("crypto", { randomUUID: () => "key-1" }); });
  it("uses authenticated self-service treatment endpoints", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ treatmentPlanId: "plan-1", percentage: 0, completedTasks: 0, totalTasks: 0, timeline: [] })).mockResolvedValueOnce(json({ id: "task-1" })).mockResolvedValueOnce(json({ id: "adherence-1" }));
    await listPatientTreatmentPlans("token"); await listPatientTreatmentTasks("token"); await getPatientTreatmentProgress("token", "plan-1"); await completePatientTreatmentTask("token", "task-1"); await recordPatientMedicationAdherence("token", "medication-1");
    const calls = fetchMock.mock.calls.map(([input, init]) => ({ url: new URL(input as string), init: init as RequestInit }));
    expect(calls.map((call) => call.url.pathname)).toEqual(["/v1/patients/me/treatment-plans", "/v1/patients/me/treatment/tasks", "/v1/patients/me/treatment-plans/plan-1/progress", "/v1/patients/me/treatment/tasks/task-1/complete", "/v1/patients/me/treatment/medications/medication-1/adherence"]);
    expect(calls.map((call) => call.init.method ?? "GET")).toEqual(["GET", "GET", "GET", "POST", "POST"]);
    expect(calls.every((call) => (call.init.headers as Record<string, string>).authorization === "Bearer token")).toBe(true);
    expect((calls[4].init.headers as Record<string, string>)["idempotency-key"]).toBe("key-1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClinicalNote, getClinicalWorkspace, publishClinicalNote, reconcileClinicalRecord, saveClinicalNote, saveClinicalRecord, signClinicalNote, signClinicalRecord } from "./clinical-workspace-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test" }));
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("dashboard clinical workspace API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("uses the authorized workspace read, revision, signing, and publication routes", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ patientId: "p" })));
    await getClinicalWorkspace("token", "patient");
    await createClinicalNote("token", "patient", "encounter", { expectedRevision: 0, content: "private", isPrivate: true, patientSummary: null });
    await saveClinicalNote("token", "patient", "note", { expectedRevision: 1, content: "private 2", isPrivate: true, patientSummary: "summary" });
    await signClinicalNote("token", "patient", "note", 2, 2);
    await publishClinicalNote("token", "patient", "note", 2, 2);
    await reconcileClinicalRecord("token", "patient", { kind: "DIAGNOSIS", sourceIntakeId: "intake", sourceIntakeRevisionId: "revision", sourceIntakeRevisionNumber: 1, reviewedContent: { label: "reviewed" } });
    await saveClinicalRecord("token", "patient", "DIAGNOSIS", "record", { expectedRevision: 1, reviewedContent: { label: "revised" } });
    await signClinicalRecord("token", "patient", "DIAGNOSIS", "record", 2, 2);
    const requests = fetchMock.mock.calls.map(([request, init]) => ({ url: request as URL, init: init as RequestInit }));
    expect(requests.map(({ url }) => url.pathname)).toEqual([
      "/v1/admin/patients/patient/clinical-workspace",
      "/v1/admin/patients/patient/clinical-workspace/encounters/encounter/notes",
      "/v1/admin/patients/patient/clinical-workspace/notes/note/revisions",
      "/v1/admin/patients/patient/clinical-workspace/notes/note/sign",
      "/v1/admin/patients/patient/clinical-workspace/notes/note/publish",
      "/v1/admin/patients/patient/clinical-workspace/records",
      "/v1/admin/patients/patient/clinical-workspace/records/DIAGNOSIS/record/revisions",
      "/v1/admin/patients/patient/clinical-workspace/records/DIAGNOSIS/record/sign",
    ]);
    expect(requests.every(({ init }) => (init.headers as Record<string, string>).authorization === "Bearer token")).toBe(true);
    expect(requests.slice(1).every(({ init }) => (init.headers as Record<string, string>)["content-type"] === "application/json")).toBe(true);
  });
});

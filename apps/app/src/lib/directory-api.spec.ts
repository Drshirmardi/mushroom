import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DirectoryRequestError, getPatientAvailability, getPatientDoctor, listPatientDoctors } from "./directory-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("patient directory API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("uses the generated directory and availability paths with bearer authentication", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [], page: 1, pageSize: 20, total: 0 })).mockResolvedValueOnce(json({ id: "doctor-1", displayName: "Doctor", specialties: [], offerings: [], languages: [], education: [], certifications: [], clinic: { id: "clinic-1", name: "Clinic", timeZone: "Asia/Tehran" } })).mockResolvedValueOnce(json({ doctorServiceId: "offering-1", timeZone: "Asia/Tehran", fromDate: "2026-09-01", toDate: "2026-09-07", items: [], page: 1, pageSize: 20, total: 0 }));
    await listPatientDoctors("token");
    await getPatientDoctor("token", "doctor-1");
    await getPatientAvailability("token", "offering-1", "2026-09-01", "2026-09-07");
    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual(["/v1/directory/doctors", "/v1/directory/doctors/doctor-1", "/v1/directory/doctor-services/offering-1/availability"]);
    expect(new URL(requests[2].url).searchParams).toMatchObject(new URLSearchParams({ fromDate: "2026-09-01", toDate: "2026-09-07" }));
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
  });

  it("preserves API errors and unavailable failures", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "DOCTOR_NOT_VISIBLE" }, 404));
    await expect(getPatientDoctor("token", "doctor-1")).rejects.toEqual(expect.objectContaining<Partial<DirectoryRequestError>>({ status: 404, code: "DOCTOR_NOT_VISIBLE" }));
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(listPatientDoctors("token")).rejects.toEqual(expect.objectContaining<Partial<DirectoryRequestError>>({ status: 0 }));
  });
});

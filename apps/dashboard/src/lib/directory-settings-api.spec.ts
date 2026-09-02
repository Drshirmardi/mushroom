import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { createAvailabilityRule, createDoctor, createDoctorService, createService, createSpecialty, loadDirectorySettings, updateClinic } from "./directory-settings-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const clinic = { id: "00000000-0000-4000-8000-000000000001", name: "کلینیک", timeZone: "Asia/Tehran", status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const page = { items: [], page: 1, pageSize: 50, total: 0 };

describe("directory settings API", () => {
  it("loads every Phase 04 settings source with the generated client", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(clinic))
      .mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page))
      .mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page));
    const result = await loadDirectorySettings(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token");
    expect(result).toMatchObject({ status: "ready", data: { clinic, doctors: [], availabilityRules: [] } });
    expect(fetch.mock.calls).toHaveLength(8);
    expect((fetch.mock.calls[0]?.[0] as Request).headers.get("authorization")).toBe("Bearer token");
  });

  it.each([401, 403])("keeps %i responses distinct as forbidden", async (status) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() => Promise.resolve(json({}, status)));
    await expect(loadDirectorySettings(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: "unauthorized" });
  });

  it("keeps an unavailable service distinct from a valid empty configuration", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("offline"));
    await expect(loadDirectorySettings(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: "unavailable" });
  });

  it("uses generated bodies and bearer authentication for Phase 04 settings writes", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(clinic)));
    await updateClinic("token", { name: "کلینیک تازه", timeZone: "Asia/Tehran" });
    await createDoctor("token", { displayName: "پزشک", isActive: true, publicationStatus: "UNPUBLISHED" });
    await createSpecialty("token", { name: "تخصص", isActive: true, publicationStatus: "UNPUBLISHED" });
    await createService("token", { name: "خدمت", isActive: true, publicationStatus: "UNPUBLISHED" });
    await createDoctorService("token", { doctorId: clinic.id, serviceId: clinic.id, visitMode: "IN_PERSON", durationMinutes: 30, bufferMinutes: 0, priceAmount: 0, currency: "IRR", isActive: true, publicationStatus: "UNPUBLISHED" });
    await createAvailabilityRule("token", { doctorId: clinic.id, visitMode: "IN_PERSON", isoWeekday: 1, startLocalTime: "09:00", endLocalTime: "10:00", isActive: true });
    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
      ["PATCH", "/v1/admin/clinic"], ["POST", "/v1/admin/doctors"], ["POST", "/v1/admin/specialties"], ["POST", "/v1/admin/services"], ["POST", "/v1/admin/doctor-services"], ["POST", "/v1/admin/availability-rules"],
    ]);
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
  });
});

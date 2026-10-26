import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAvailabilityRule, createDoctor, createDoctorService, createService, createSpecialty, deleteAvailabilityRule, deleteDoctorService, deleteSpecialty, directoryMutationMessage, getClinic, loadDirectorySettings, updateAvailabilityRule, updateClinic, updateSpecialty } from "./directory-settings-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const clinic = { id: "00000000-0000-4000-8000-000000000001", name: "کلینیک", timeZone: "Asia/Tehran", status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const page = { items: [], page: 1, pageSize: 50, total: 0 };

describe("directory settings API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("loads every Phase 04 settings source with the generated client", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json(clinic))
      .mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page))
      .mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json(page));
    const result = await loadDirectorySettings(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token");
    expect(result).toMatchObject({ status: "ready", data: { clinic, doctors: [], availabilityRules: [] } });
    expect(fetch.mock.calls).toHaveLength(8);
    expect((fetch.mock.calls[0]?.[0] as Request).headers.get("authorization")).toBe("Bearer token");
    const listUrls = fetch.mock.calls.slice(1).map(([request]) => new URL((request as Request).url));
    expect(listUrls.every((url) => url.searchParams.get("page") === "1" && url.searchParams.get("pageSize") === "50")).toBe(true);
  });

  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
  ] as const)("maps %i responses to %s", async (status, expected) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() => Promise.resolve(json({}, status)));
    await expect(loadDirectorySettings(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: expected });
  });

  it("keeps an unavailable service distinct from a valid empty configuration", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("offline"));
    await expect(loadDirectorySettings(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toEqual({ status: "unavailable" });
  });

  it("loads the authorized clinic for clinic-scoped dashboard features", async () => {
    fetchMock.mockResolvedValueOnce(json(clinic));
    await expect(getClinic("token")).resolves.toEqual(clinic);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("authorization")]).toEqual(["GET", "/v1/admin/clinic", "Bearer token"]);
  });

  it("preserves stable API errors and supports publishing a specialty", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...clinic, publicationStatus: "PUBLISHED" })).mockResolvedValueOnce(json({ code: "DIRECTORY_PUBLICATION_INVALID", message: "invalid", details: {} }, 409));
    await updateSpecialty("token", clinic.id, { isActive: true, publicationStatus: "PUBLISHED" });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname]).toEqual(["PATCH", `/v1/admin/specialties/${clinic.id}`]);
    const error = await createDoctor("token", { displayName: "پزشک", publicationStatus: "PUBLISHED" }).catch((reason: unknown) => reason);
    expect(error).toMatchObject({ status: 409, code: "DIRECTORY_PUBLICATION_INVALID" });
    expect(directoryMutationMessage(error)).toBe("پیش‌نیاز انتشار کامل نیست؛ تخصص، پزشک و خدمت باید فعال و منتشرشده باشند.");
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

  it("supports editing and deleting existing settings records", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...clinic, doctorId: clinic.id, visitMode: "ONLINE", isoWeekday: 2, startLocalTime: "10:00", endLocalTime: "12:00", isActive: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateAvailabilityRule("token", clinic.id, { startLocalTime: "10:00", endLocalTime: "12:00" });
    await deleteAvailabilityRule("token", clinic.id);
    await deleteDoctorService("token", clinic.id);
    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
      ["PATCH", `/v1/admin/availability-rules/${clinic.id}`],
      ["DELETE", `/v1/admin/availability-rules/${clinic.id}`],
      ["DELETE", `/v1/admin/doctor-services/${clinic.id}`],
    ]);
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
  });

  it("explains when a referenced directory record cannot be deleted", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "DIRECTORY_RECORD_IN_USE", message: "in use", details: {} }, 409));
    const error = await deleteSpecialty("token", clinic.id).catch((reason: unknown) => reason);
    expect(directoryMutationMessage(error)).toBe("این رکورد در نوبت‌ها یا تنظیمات دیگر استفاده شده و قابل حذف نیست؛ آن را غیرفعال کنید.");
  });
});

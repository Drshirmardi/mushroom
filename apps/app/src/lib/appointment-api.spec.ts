import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppointmentRequestError, cancelPatientAppointment, createPatientAppointment, listPatientAppointments, reschedulePatientAppointment } from "./appointment-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", sessionFetch: fetchMock }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("patient appointment API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("uses the real patient appointment endpoints with authenticated requests", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [], page: 1, pageSize: 100, total: 0 })).mockResolvedValueOnce(json({ id: "a1" }, 201)).mockResolvedValueOnce(json({ id: "a1" })).mockResolvedValueOnce(json({ id: "a1" }));
    await listPatientAppointments("token"); await createPatientAppointment("token", { doctorServiceId: "service-1", startsAt: "2026-09-10T10:00:00.000Z" }, "key-1"); await cancelPatientAppointment("token", "a1", "changed plans"); await reschedulePatientAppointment("token", "a1", { doctorServiceId: "service-1", startsAt: "2026-09-11T10:00:00.000Z" });
    const requests = fetchMock.mock.calls.map(([input, init]) => ({ url: input as URL, init: init as RequestInit }));
    expect(requests.map(({ url }) => url.pathname)).toEqual(["/v1/appointments", "/v1/appointments", "/v1/appointments/a1/cancel", "/v1/appointments/a1/reschedule"]);
    expect(requests[1].init.headers).toMatchObject({ authorization: "Bearer token", "idempotency-key": "key-1" });
    expect(requests.slice(1).map(({ init }) => init.method)).toEqual(["POST", "POST", "POST"]);
  });

  it("preserves appointment API failures", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "APPOINTMENT_SLOT_CONFLICT" }, 409));
    await expect(createPatientAppointment("token", { doctorServiceId: "service-1", startsAt: "2026-09-10T10:00:00.000Z" }, "key-1")).rejects.toEqual(expect.objectContaining<Partial<AppointmentRequestError>>({ status: 409, code: "APPOINTMENT_SLOT_CONFLICT" }));
  });
});

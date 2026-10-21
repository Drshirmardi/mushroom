import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { getAdminPatientAssessmentSubmissions, getAdminPatients, getAssessmentResultBandTitle } from "./patient-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }),
}));

describe("patient assessment submissions API", () => {
  it("uses the ADMIN patient filter and bearer token", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], page: 1, pageSize: 50, total: 0 }), { status: 200, headers: { "content-type": "application/json" } }));
    await getAdminPatientAssessmentSubmissions("access-token", "00000000-0000-4000-8000-000000000001");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://api.example.test/v1/admin/assessment-submissions?patientId=00000000-0000-4000-8000-000000000001&pageSize=50");
    expect(request.headers.get("authorization")).toBe("Bearer access-token");
  });

  it("sends server-side search and pagination", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], page: 2, pageSize: 50, total: 0 }), { status: 200, headers: { "content-type": "application/json" } }));
    await getAdminPatients("access-token", { query: " +989120000000 ", page: 2, pageSize: 50 });
    const request = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]?.[0] as Request;
    const url = new URL(request.url);
    expect(request.headers.get("authorization")).toBe("Bearer access-token");
    expect(url.pathname).toBe("/v1/admin/patients");
    expect(url.searchParams.get("query")).toBe("+989120000000");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("50");
  });

  it("reads the stored result-band title", () => {
    expect(getAssessmentResultBandTitle({ resultBand: { id: "high", title: "نیازمند پیگیری" } })).toBe("نیازمند پیگیری");
    expect(getAssessmentResultBandTitle(null)).toBeNull();
    expect(getAssessmentResultBandTitle(undefined)).toBeNull();
  });
});

import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { getAdminPatientAssessmentSubmissions } from "./patient-api";

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
});

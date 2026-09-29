import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiClient: { GET: vi.fn() } }));

import { apiClient } from "@/lib/api";
import { AuditViewerApiError, getAuditEvents } from "./audit-viewer-api";

describe("getAuditEvents", () => {
  afterEach(() => vi.clearAllMocks());

  it("uses the redacted admin audit endpoint with only its documented filters", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: { clinicId: "dbe1589e-ec9d-4ecb-bda2-046b19cf7e34", timeZone: "Asia/Tehran", from: "2026-09-01", to: "2026-09-30", asOf: "2026-09-30T00:00:00.000Z", items: [], nextCursor: null }, response: new Response(null, { status: 200 }) } as never);
    await expect(getAuditEvents("token", { from: "2026-09-01", to: "2026-09-30", action: "READ", subjectType: "ClinicalNote", limit: 25 })).resolves.toMatchObject({ timeZone: "Asia/Tehran", items: [] });
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/admin/audit-events", expect.objectContaining({ params: { query: { from: "2026-09-01", to: "2026-09-30", action: "READ", subjectType: "ClinicalNote", limit: 25 } }, headers: { authorization: "Bearer token" } }));
  });

  it("never substitutes an audit fallback when authorization fails", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: undefined, response: { status: 403 } } as never);
    await expect(getAuditEvents("token")).rejects.toBeInstanceOf(AuditViewerApiError);
  });
});

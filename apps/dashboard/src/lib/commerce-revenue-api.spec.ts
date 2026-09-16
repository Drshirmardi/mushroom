import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiClient: { GET: vi.fn() } }));

import { apiClient } from "@/lib/api";
import { CommerceRevenueApiError, getCommerceRevenue } from "./commerce-revenue-api";

describe("getCommerceRevenue", () => {
  afterEach(() => vi.clearAllMocks());

  it("uses the authoritative admin endpoint and forwards only range options", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: { currency: "TOMAN", timeZone: "Asia/Tehran", from: "2026-03-20", to: "2026-03-21", grossCapturedToman: "100000", completedRefundToman: "0", netRevenueToman: "100000", successfulPaymentCount: 1, series: [] }, response: new Response(null, { status: 200 }), error: undefined } as never);
    await expect(getCommerceRevenue("token", { from: "2026-03-20", to: "2026-03-21", granularity: "DAY" })).resolves.toMatchObject({ currency: "TOMAN", grossCapturedToman: "100000" });
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/admin/commerce/revenue", expect.objectContaining({ params: { query: { from: "2026-03-20", to: "2026-03-21", granularity: "DAY" } }, headers: { authorization: "Bearer token" } }));
  });

  it("surfaces a stable API error instead of substituting mock revenue", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: undefined, error: { code: "FORBIDDEN", message: "forbidden" }, response: { status: 403 } } as never);
    await expect(getCommerceRevenue("token")).rejects.toBeInstanceOf(CommerceRevenueApiError);
  });
});

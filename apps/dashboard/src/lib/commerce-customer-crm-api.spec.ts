import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommerceCustomerCrmApiError, getCommerceCustomers } from "./commerce-customer-crm-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const clinicId = "00000000-0000-4000-8000-000000000001";
const page = {
  clinicId,
  currency: "TOMAN" as const,
  timeZone: "Asia/Tehran",
  asOf: "2026-09-28T12:00:00.000Z",
  page: 1,
  pageSize: 25,
  totalCustomerCount: 0,
  summary: { totalCustomerCount: 0, vipCustomerCount: 0, netSpendToman: "0", averageNetSpendToman: "0" },
  items: [],
};

describe("commerce customer CRM dashboard API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("uses the real scoped CRM route with the requested filters", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(page), { status: 200, headers: { "content-type": "application/json" } }));
    await expect(getCommerceCustomers("token", { clinicId, page: 2, pageSize: 10, search: "مینا", segment: "VIP", sort: "NET_SPEND", direction: "DESC" })).resolves.toMatchObject(page);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(`https://api.example.test/v1/admin/commerce/customers?clinicId=${clinicId}&page=2&pageSize=10&search=%D9%85%DB%8C%D9%86%D8%A7&segment=VIP&sort=NET_SPEND&direction=DESC`);
    expect(request.headers.get("authorization")).toBe("Bearer token");
  });

  it("surfaces a CRM API failure instead of substituting customer data", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: "FORBIDDEN" }), { status: 403 }));
    await expect(getCommerceCustomers("token", { clinicId })).rejects.toEqual(expect.objectContaining<Partial<CommerceCustomerCrmApiError>>({ status: 403 }));
  });
});

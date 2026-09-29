import { describe, expect, it, vi } from "vitest";

import { loadDashboardHomeReporting } from "./dashboard-home-reporting";

const asOf = "2026-03-20T20:30:00.000Z";
const response = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });

function responses(sourceStatus: "current" | "partial" | "stale" = "current") {
  const shared = { clinicId: "clinic-1", timeZone: "Asia/Tehran", from: "2026-03-21", to: "2026-03-21", asOf, sourceStatus };
  return [
    response({ ...shared, newPatients: 1, onboardingComplete: 2, onboardingIncomplete: 3 }),
    response({ ...shared, scheduled: 4, completed: 2, cancelled: 1, noShow: 1, completionRate: 50, averageWaitMinutes: 12, items: [{ id: "appointment-1", startsAt: asOf, status: "CONFIRMED" }], nextCursor: null }),
    response({ ...shared, started: 1, completed: 1, completionRate: 100 }),
    response({ ...shared, activePlans: 2, dueTasks: 3, completedTasks: 4, completionRate: 80 }),
    response({ ...shared, currency: "TOMAN", revenueLabel: "operational revenue", grossCapturedToman: "100000", completedRefundToman: "0", netRevenueToman: "100000", successfulPaymentCount: 1, refundPending: 2, series: [] }),
    response({ recentAppointmentActivity: [{ id: "activity-1", type: "APPOINTMENT_CREATED", createdAt: asOf }] }),
  ];
}

describe("loadDashboardHomeReporting", () => {
  it("loads only the inventory-backed Home sources for Tehran today", async () => {
    const GET = vi.fn().mockResolvedValueOnce(responses()[0]).mockResolvedValueOnce(responses()[1]).mockResolvedValueOnce(responses()[2]).mockResolvedValueOnce(responses()[3]).mockResolvedValueOnce(responses()[4]).mockResolvedValueOnce(responses()[5]);

    const result = await loadDashboardHomeReporting({ GET } as never, "token", new Date(asOf));

    expect(result).toMatchObject({ status: "ready", report: { revenue: { refundPending: 2 }, recentActivity: [{ id: "activity-1", type: "APPOINTMENT_CREATED", createdAt: asOf }] } });
    expect(GET.mock.calls.map(([path]) => path)).toEqual([
      "/v1/admin/reporting/patients",
      "/v1/admin/reporting/appointments",
      "/v1/admin/reporting/assessments",
      "/v1/admin/reporting/treatments",
      "/v1/admin/commerce/revenue",
      "/v1/admin/appointments/dashboard-summary",
    ]);
    expect(GET).toHaveBeenNthCalledWith(1, "/v1/admin/reporting/patients", { headers: { authorization: "Bearer token" }, params: { query: { from: "2026-03-21", to: "2026-03-21" } } });
    expect(GET).toHaveBeenNthCalledWith(2, "/v1/admin/reporting/appointments", { headers: { authorization: "Bearer token" }, params: { query: { from: "2026-03-21", to: "2026-03-21", limit: 10 } } });
  });

  it("does not substitute data when a Home source is forbidden", async () => {
    const sourceResponses = responses();
    sourceResponses[3] = response(undefined, 403);
    const GET = vi.fn().mockImplementation(() => Promise.resolve(sourceResponses.shift()));

    await expect(loadDashboardHomeReporting({ GET } as never, "token", new Date(asOf))).resolves.toEqual({ status: "unauthorized" });
  });

  it("exposes unavailable Home data as an error rather than a fallback", async () => {
    const sourceResponses = responses();
    sourceResponses[4] = response(undefined, 500);
    const GET = vi.fn().mockImplementation(() => Promise.resolve(sourceResponses.shift()));

    await expect(loadDashboardHomeReporting({ GET } as never, "token", new Date(asOf))).resolves.toEqual({ status: "error" });
  });
});

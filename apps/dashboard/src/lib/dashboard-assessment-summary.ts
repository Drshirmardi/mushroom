import { createApiClient, type components } from "@sabz-zendegi/api-client";

type ApiClient = ReturnType<typeof createApiClient>;

export type DashboardAssessmentSummary = {
  completed: number;
  pending: number;
  recentActivity: Array<Pick<components["schemas"]["AdminAssessmentSubmissionResponseDto"], "id" | "assessmentTitle" | "completedAt">>;
};

export type DashboardAssessmentSummaryState =
  | { status: "ready"; summary: DashboardAssessmentSummary }
  | { status: "unauthorized" }
  | { status: "error" };

export async function loadDashboardAssessmentSummary(
  client: ApiClient,
  accessToken: string,
): Promise<DashboardAssessmentSummaryState> {
  try {
    const headers = { authorization: `Bearer ${accessToken}` };
    const [completed, pending] = await Promise.all([
      client.GET("/v1/admin/assessment-submissions", { headers, params: { query: { state: "COMPLETE", pageSize: 5 } } }),
      client.GET("/v1/admin/assessment-submissions", { headers, params: { query: { state: "IN_PROGRESS", pageSize: 1 } } }),
    ]);

    if (completed.response.status === 401 || completed.response.status === 403 || pending.response.status === 401 || pending.response.status === 403) return { status: "unauthorized" };
    if (!completed.response.ok || !pending.response.ok || !completed.data || !pending.data) return { status: "error" };

    return {
      status: "ready",
      summary: {
        completed: completed.data.total,
        pending: pending.data.total,
        recentActivity: completed.data.items
          .filter((submission) => submission.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()),
      },
    };
  } catch {
    return { status: "error" };
  }
}

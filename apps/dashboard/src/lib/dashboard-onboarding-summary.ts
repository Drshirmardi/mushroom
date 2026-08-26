import { createApiClient, type components } from "@sabz-zendegi/api-client";

type ApiClient = ReturnType<typeof createApiClient>;

export type DashboardOnboardingSummaryState =
  | { status: "ready"; summary: components["schemas"]["AdminOnboardingSummaryResponseDto"] }
  | { status: "unauthorized" }
  | { status: "error" };

export async function loadDashboardOnboardingSummary(
  client: ApiClient,
  accessToken: string,
): Promise<DashboardOnboardingSummaryState> {
  try {
    const { data, response } = await client.GET("/v1/admin/patients/onboarding-summary", {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) return { status: "unauthorized" };
    if (!response.ok || !data) return { status: "error" };

    return { status: "ready", summary: data };
  } catch {
    return { status: "error" };
  }
}

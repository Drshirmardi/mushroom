import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiClient } from "@/lib/api";
export type HealthObservationList = components["schemas"]["HealthObservationListResponseDto"];
export type HealthObservationMetric = components["schemas"]["HealthObservationResponseDto"]["metric"];
export class HealthObservationsApiError extends Error { constructor(public readonly status: number) { super("دریافت داده‌های سلامت با خطا روبه‌رو شد."); } }
export async function getAdminHealthObservations(accessToken: string, patientId: string, metric: HealthObservationMetric): Promise<HealthObservationList> {
  const { data, response } = await withRequestTimeout(apiClient.GET("/v1/admin/patients/{patientId}/health-observations", { headers: { authorization: `Bearer ${accessToken}` }, params: { path: { patientId }, query: { metric, limit: 100 } } }));
  if (!data) throw new HealthObservationsApiError(response.status);
  return data;
}

import { createApiClient, type components } from "@sabz-zendegi/api-client";

type ApiClient = ReturnType<typeof createApiClient>;
type SourceStatus = "current" | "partial" | "stale";

export type DashboardHomeReporting = {
  patients: components["schemas"]["PatientReportingResponseDto"];
  appointments: components["schemas"]["AppointmentReportingResponseDto"];
  assessments: components["schemas"]["AssessmentReportingResponseDto"];
  treatments: components["schemas"]["TreatmentReportingResponseDto"];
  revenue: components["schemas"]["CommerceRevenueDto"];
  recentActivity: Array<{ id: string; type: string; createdAt: string }>;
  sourceStatus: SourceStatus;
};

export type DashboardHomeReportingState =
  | { status: "ready"; report: DashboardHomeReporting }
  | { status: "unauthorized" }
  | { status: "error" };

const tehranDate = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const combinedSourceStatus = (statuses: SourceStatus[]): SourceStatus => statuses.includes("stale") ? "stale" : statuses.includes("partial") ? "partial" : "current";

export async function loadDashboardHomeReporting(client: ApiClient, accessToken: string, now = new Date()): Promise<DashboardHomeReportingState> {
  const headers = { authorization: `Bearer ${accessToken}` };
  const today = tehranDate(now);
  try {
    const [patients, appointments, assessments, treatments, revenue, activity] = await Promise.all([
      client.GET("/v1/admin/reporting/patients", { headers, params: { query: { from: today, to: today } } }),
      client.GET("/v1/admin/reporting/appointments", { headers, params: { query: { from: today, to: today, limit: 10 } } }),
      client.GET("/v1/admin/reporting/assessments", { headers, params: { query: { from: today, to: today } } }),
      client.GET("/v1/admin/reporting/treatments", { headers, params: { query: { from: today, to: today } } }),
      client.GET("/v1/admin/commerce/revenue", { headers, params: { query: { from: today, to: today, granularity: "DAY" } } }),
      client.GET("/v1/admin/appointments/dashboard-summary", { headers }),
    ]);
    const responses = [patients, appointments, assessments, treatments, revenue, activity];
    if (responses.some(({ response }) => response.status === 401 || response.status === 403)) return { status: "unauthorized" };
    if (!patients.response.ok || !appointments.response.ok || !assessments.response.ok || !treatments.response.ok || !revenue.response.ok || !activity.response.ok || !patients.data || !appointments.data || !assessments.data || !treatments.data || !revenue.data || !activity.data) return { status: "error" };
    return { status: "ready", report: { patients: patients.data, appointments: appointments.data, assessments: assessments.data, treatments: treatments.data, revenue: revenue.data, recentActivity: activity.data.recentAppointmentActivity.slice(0, 10).map(({ id, type, createdAt }) => ({ id, type, createdAt })), sourceStatus: combinedSourceStatus([patients.data.sourceStatus, appointments.data.sourceStatus, assessments.data.sourceStatus, treatments.data.sourceStatus, revenue.data.sourceStatus]) } };
  } catch {
    return { status: "error" };
  }
}

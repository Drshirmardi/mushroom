import {
  type components,
  withRequestTimeout,
} from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type AdminPatientList = components["schemas"]["AdminPatientListResponseDto"];
export type AdminPatientDetail = components["schemas"]["AdminPatientDetailResponseDto"];
export type AdminAssessmentSubmissionList = components["schemas"]["AdminAssessmentSubmissionListResponseDto"];

export class PatientApiError extends Error {
  constructor(
    public readonly status: number,
    message = "دریافت اطلاعات بیمار با خطا روبه‌رو شد.",
  ) {
    super(message);
  }
}

export function getAssessmentResultBandTitle(snapshot: Record<string, unknown> | null | undefined) {
  const band = snapshot?.resultBand;
  return band && typeof band === "object" && "title" in band && typeof band.title === "string"
    ? band.title
    : null;
}

function authorization(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

export interface AdminPatientListQuery {
  query?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminPatients(
  accessToken: string,
  query: AdminPatientListQuery = {},
): Promise<AdminPatientList> {
  const params = {
    query: {
      ...(query.query?.trim() ? { query: query.query.trim() } : {}),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    } as never,
  };
  const { data, response } = await withRequestTimeout(
    apiClient.GET("/v1/admin/patients", { headers: authorization(accessToken), params }),
  );
  if (!data) throw new PatientApiError(response.status);
  return data;
}

export async function getAdminPatient(
  accessToken: string,
  patientId: string,
): Promise<AdminPatientDetail> {
  const { data, response } = await withRequestTimeout(
    apiClient.GET("/v1/admin/patients/{patientId}", {
      headers: authorization(accessToken),
      params: { path: { patientId } },
    }),
  );
  if (!data) throw new PatientApiError(response.status);
  return data;
}

export async function getAdminPatientAssessmentSubmissions(
  accessToken: string,
  patientId: string,
): Promise<AdminAssessmentSubmissionList> {
  const { data, response } = await withRequestTimeout(
    apiClient.GET("/v1/admin/assessment-submissions", {
      headers: authorization(accessToken),
      params: { query: { patientId, pageSize: 50 } },
    }),
  );
  if (!data) throw new PatientApiError(response.status);
  return data;
}

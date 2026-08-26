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

function authorization(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

export async function getAdminPatients(accessToken: string): Promise<AdminPatientList> {
  const { data, response } = await withRequestTimeout(
    apiClient.GET("/v1/admin/patients", { headers: authorization(accessToken) }),
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

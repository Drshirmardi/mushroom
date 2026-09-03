import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type PatientClinicalItem = components["schemas"]["PatientClinicalItemResponseDto"];
export type PatientClinicalList = components["schemas"]["PatientClinicalListResponseDto"];

export class ClinicalHistoryApiError extends Error {
  constructor(public readonly status: number) {
    super("CLINICAL_HISTORY_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> {
  try {
    const { data, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    throw new ClinicalHistoryApiError(response.status);
  } catch (error) {
    if (error instanceof ClinicalHistoryApiError) throw error;
    throw new ClinicalHistoryApiError(0);
  }
}

export const getPatientClinicalHistory = (accessToken: string) => dataOrThrow<PatientClinicalList>(
  apiClient.GET("/v1/patients/me/clinical/history", { headers: authorization(accessToken) }),
);

export const getPatientClinicalTimeline = (accessToken: string) => dataOrThrow<PatientClinicalList>(
  apiClient.GET("/v1/patients/me/clinical/timeline", { headers: authorization(accessToken) }),
);

export const getPatientAppointmentSummary = (accessToken: string, appointmentId: string) => dataOrThrow<PatientClinicalItem>(
  apiClient.GET("/v1/patients/me/clinical/appointments/{appointmentId}/summary", { headers: authorization(accessToken), params: { path: { appointmentId } } }),
);

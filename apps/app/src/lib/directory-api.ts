import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";
import { PATIENT_CATALOG_TTL_MS, patientCacheKey, patientCachedData } from "@/lib/patient-request";

export type PatientDoctor = components["schemas"]["PatientDoctorListItemDto"];
export type PatientDoctorDetail = components["schemas"]["PatientDoctorDetailDto"];
export type PatientAvailability = components["schemas"]["PatientAvailabilityResponseDto"];

export class DirectoryRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "DIRECTORY_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function expectData<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new DirectoryRequestError(response.status, code);
  } catch (error) {
    if (error instanceof DirectoryRequestError) throw error;
    throw new DirectoryRequestError(0);
  }
}

export const listPatientDoctors = (accessToken: string) => patientCachedData(patientCacheKey(accessToken, "doctors"), PATIENT_CATALOG_TTL_MS, () => expectData<components["schemas"]["PatientDoctorPageResponseDto"]>(
  apiClient.GET("/v1/directory/doctors", { headers: authorization(accessToken) }),
));

export const getPatientDoctor = (accessToken: string, doctorId: string) => expectData<PatientDoctorDetail>(
  apiClient.GET("/v1/directory/doctors/{doctorId}", { headers: authorization(accessToken), params: { path: { doctorId } } }),
);

export const getPatientAvailability = (accessToken: string, doctorServiceId: string, fromDate: string, toDate: string, page = 1) => expectData<PatientAvailability>(
  apiClient.GET("/v1/directory/doctor-services/{doctorServiceId}/availability", { headers: authorization(accessToken), params: { path: { doctorServiceId }, query: { fromDate, toDate, page, pageSize: 100 } } }),
);

export function directoryErrorMessage(error: unknown) {
  if (!(error instanceof DirectoryRequestError) || error.status === 0) return "سرویس پزشکان و زمان‌های آزاد در دسترس نیست؛ دوباره تلاش کنید.";
  if (error.status === 401 || error.status === 403) return "اجازهٔ مشاهدهٔ اطلاعات پزشکان را ندارید.";
  if (error.status === 404) return "این پزشک یا خدمت منتشرشده در دسترس نیست.";
  return "دریافت اطلاعات پزشکان انجام نشد؛ دوباره تلاش کنید.";
}

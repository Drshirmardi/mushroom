import { createApiClient, type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

type ApiClient = ReturnType<typeof createApiClient>;

export type Clinic = components["schemas"]["ClinicResponseDto"];
export type Doctor = components["schemas"]["DoctorResponseDto"];
export type Specialty = components["schemas"]["SpecialtyResponseDto"];
export type Service = components["schemas"]["ServiceResponseDto"];
export type DoctorService = components["schemas"]["DoctorServiceResponseDto"];
export type AvailabilityRule = components["schemas"]["AvailabilityRuleResponseDto"];
export type ClinicClosure = components["schemas"]["ClinicClosureResponseDto"];
export type DoctorException = components["schemas"]["DoctorAvailabilityExceptionResponseDto"];

export interface DirectorySettingsData {
  clinic: Clinic;
  doctors: Doctor[];
  specialties: Specialty[];
  services: Service[];
  doctorServices: DoctorService[];
  availabilityRules: AvailabilityRule[];
  closures: ClinicClosure[];
  exceptions: DoctorException[];
}

export type DirectorySettingsState =
  | { status: "ready"; data: DirectorySettingsData }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" }
  | { status: "error" };

export class DirectorySettingsApiError extends Error {
  constructor(public readonly status: number) {
    super("Directory settings request failed.");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

function statusFor(error: unknown) {
  return error instanceof DirectorySettingsApiError ? error.status : 0;
}

async function dataOrThrow<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> {
  try {
    const { data, response } = await withRequestTimeout(request);
    if (!response.ok || !data) throw new DirectorySettingsApiError(response.status);
    return data;
  } catch (error) {
    if (error instanceof DirectorySettingsApiError) throw error;
    throw new DirectorySettingsApiError(0);
  }
}

export async function loadDirectorySettings(client: ApiClient, accessToken: string): Promise<DirectorySettingsState> {
  try {
    const headers = authorization(accessToken);
    const [clinic, doctors, specialties, services, doctorServices, availabilityRules, closures, exceptions] = await Promise.all([
      dataOrThrow<Clinic>(client.GET("/v1/admin/clinic", { headers })),
      dataOrThrow<components["schemas"]["DoctorPageResponseDto"]>(client.GET("/v1/admin/doctors", { headers })),
      dataOrThrow<components["schemas"]["DirectoryPageResponseDto"]>(client.GET("/v1/admin/specialties", { headers })),
      dataOrThrow<components["schemas"]["DirectoryPageResponseDto"]>(client.GET("/v1/admin/services", { headers })),
      dataOrThrow<components["schemas"]["DoctorServicePageResponseDto"]>(client.GET("/v1/admin/doctor-services", { headers })),
      dataOrThrow<components["schemas"]["AvailabilityRulePageResponseDto"]>(client.GET("/v1/admin/availability-rules", { headers })),
      dataOrThrow<components["schemas"]["ClinicClosurePageResponseDto"]>(client.GET("/v1/admin/clinic-closures", { headers })),
      dataOrThrow<components["schemas"]["DoctorAvailabilityExceptionPageResponseDto"]>(client.GET("/v1/admin/doctor-availability-exceptions", { headers })),
    ]);
    return { status: "ready", data: { clinic, doctors: doctors.items, specialties: specialties.items, services: services.items, doctorServices: doctorServices.items, availabilityRules: availabilityRules.items, closures: closures.items, exceptions: exceptions.items } };
  } catch (error) {
    const status = statusFor(error);
    if (status === 401) return { status: "unauthenticated" };
    if (status === 403) return { status: "forbidden" };
    if (status === 0 || status === 503 || status === 504) return { status: "unavailable" };
    return { status: "error" };
  }
}

export const updateClinic = (accessToken: string, body: components["schemas"]["UpdateClinicDto"]) => dataOrThrow<Clinic>(apiClient.PATCH("/v1/admin/clinic", { headers: authorization(accessToken), body }));
export const getClinic = (accessToken: string) => dataOrThrow<Clinic>(apiClient.GET("/v1/admin/clinic", { headers: authorization(accessToken) }));
export const createDoctor = (accessToken: string, body: components["schemas"]["CreateDoctorDto"]) => dataOrThrow<Doctor>(apiClient.POST("/v1/admin/doctors", { headers: authorization(accessToken), body }));
export const updateDoctor = (accessToken: string, doctorId: string, body: components["schemas"]["UpdateDoctorDto"]) => dataOrThrow<Doctor>(apiClient.PATCH("/v1/admin/doctors/{doctorId}", { headers: authorization(accessToken), params: { path: { doctorId } }, body }));
export const createSpecialty = (accessToken: string, body: components["schemas"]["CreateSpecialtyDto"]) => dataOrThrow<Specialty>(apiClient.POST("/v1/admin/specialties", { headers: authorization(accessToken), body }));
export const createService = (accessToken: string, body: components["schemas"]["CreateServiceDto"]) => dataOrThrow<Service>(apiClient.POST("/v1/admin/services", { headers: authorization(accessToken), body }));
export const updateService = (accessToken: string, serviceId: string, body: components["schemas"]["UpdateServiceDto"]) => dataOrThrow<Service>(apiClient.PATCH("/v1/admin/services/{serviceId}", { headers: authorization(accessToken), params: { path: { serviceId } }, body }));
export const createDoctorService = (accessToken: string, body: components["schemas"]["CreateDoctorServiceDto"]) => dataOrThrow<DoctorService>(apiClient.POST("/v1/admin/doctor-services", { headers: authorization(accessToken), body }));
export const updateDoctorService = (accessToken: string, doctorServiceId: string, body: components["schemas"]["UpdateDoctorServiceDto"]) => dataOrThrow<DoctorService>(apiClient.PATCH("/v1/admin/doctor-services/{doctorServiceId}", { headers: authorization(accessToken), params: { path: { doctorServiceId } }, body }));
export const createAvailabilityRule = (accessToken: string, body: components["schemas"]["CreateAvailabilityRuleDto"]) => dataOrThrow<AvailabilityRule>(apiClient.POST("/v1/admin/availability-rules", { headers: authorization(accessToken), body }));
export const createClinicClosure = (accessToken: string, body: components["schemas"]["CreateClinicClosureDto"]) => dataOrThrow<ClinicClosure>(apiClient.POST("/v1/admin/clinic-closures", { headers: authorization(accessToken), body }));
export const createDoctorException = (accessToken: string, body: components["schemas"]["CreateDoctorAvailabilityExceptionDto"]) => dataOrThrow<DoctorException>(apiClient.POST("/v1/admin/doctor-availability-exceptions", { headers: authorization(accessToken), body }));

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
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "DIRECTORY_SETTINGS_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

function statusFor(error: unknown) {
  return error instanceof DirectorySettingsApiError ? error.status : 0;
}

async function dataOrThrow<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    if (!response.ok || !data) throw new DirectorySettingsApiError(response.status, code);
    return data;
  } catch (error) {
    if (error instanceof DirectorySettingsApiError) throw error;
    throw new DirectorySettingsApiError(0);
  }
}

async function voidOrThrow(request: Promise<{ error?: unknown; response: Response }>): Promise<void> {
  try {
    const { error, response } = await withRequestTimeout(request);
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    if (!response.ok) throw new DirectorySettingsApiError(response.status, code);
  } catch (error) {
    if (error instanceof DirectorySettingsApiError) throw error;
    throw new DirectorySettingsApiError(0);
  }
}

export async function loadDirectorySettings(client: ApiClient, accessToken: string): Promise<DirectorySettingsState> {
  try {
    const headers = authorization(accessToken);
    const pageQuery = { page: 1, pageSize: 50 } as never;
    const [clinic, doctors, specialties, services, doctorServices, availabilityRules, closures, exceptions] = await Promise.all([
      dataOrThrow<Clinic>(client.GET("/v1/admin/clinic", { headers })),
      dataOrThrow<components["schemas"]["DoctorPageResponseDto"]>(client.GET("/v1/admin/doctors", { headers, params: { query: pageQuery } })),
      dataOrThrow<components["schemas"]["DirectoryPageResponseDto"]>(client.GET("/v1/admin/specialties", { headers, params: { query: pageQuery } })),
      dataOrThrow<components["schemas"]["DirectoryPageResponseDto"]>(client.GET("/v1/admin/services", { headers, params: { query: pageQuery } })),
      dataOrThrow<components["schemas"]["DoctorServicePageResponseDto"]>(client.GET("/v1/admin/doctor-services", { headers, params: { query: pageQuery } })),
      dataOrThrow<components["schemas"]["AvailabilityRulePageResponseDto"]>(client.GET("/v1/admin/availability-rules", { headers, params: { query: pageQuery } })),
      dataOrThrow<components["schemas"]["ClinicClosurePageResponseDto"]>(client.GET("/v1/admin/clinic-closures", { headers, params: { query: pageQuery } })),
      dataOrThrow<components["schemas"]["DoctorAvailabilityExceptionPageResponseDto"]>(client.GET("/v1/admin/doctor-availability-exceptions", { headers, params: { query: pageQuery } })),
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
export const deleteDoctor = (accessToken: string, doctorId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/doctors/{doctorId}", { headers: authorization(accessToken), params: { path: { doctorId } } }));
export const createSpecialty = (accessToken: string, body: components["schemas"]["CreateSpecialtyDto"]) => dataOrThrow<Specialty>(apiClient.POST("/v1/admin/specialties", { headers: authorization(accessToken), body }));
export const updateSpecialty = (accessToken: string, specialtyId: string, body: components["schemas"]["UpdateSpecialtyDto"]) => dataOrThrow<Specialty>(apiClient.PATCH("/v1/admin/specialties/{specialtyId}", { headers: authorization(accessToken), params: { path: { specialtyId } }, body }));
export const deleteSpecialty = (accessToken: string, specialtyId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/specialties/{specialtyId}", { headers: authorization(accessToken), params: { path: { specialtyId } } }));
export const createService = (accessToken: string, body: components["schemas"]["CreateServiceDto"]) => dataOrThrow<Service>(apiClient.POST("/v1/admin/services", { headers: authorization(accessToken), body }));
export const updateService = (accessToken: string, serviceId: string, body: components["schemas"]["UpdateServiceDto"]) => dataOrThrow<Service>(apiClient.PATCH("/v1/admin/services/{serviceId}", { headers: authorization(accessToken), params: { path: { serviceId } }, body }));
export const deleteService = (accessToken: string, serviceId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/services/{serviceId}", { headers: authorization(accessToken), params: { path: { serviceId } } }));
export const createDoctorService = (accessToken: string, body: components["schemas"]["CreateDoctorServiceDto"]) => dataOrThrow<DoctorService>(apiClient.POST("/v1/admin/doctor-services", { headers: authorization(accessToken), body }));
export const updateDoctorService = (accessToken: string, doctorServiceId: string, body: components["schemas"]["UpdateDoctorServiceDto"]) => dataOrThrow<DoctorService>(apiClient.PATCH("/v1/admin/doctor-services/{doctorServiceId}", { headers: authorization(accessToken), params: { path: { doctorServiceId } }, body }));
export const deleteDoctorService = (accessToken: string, doctorServiceId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/doctor-services/{doctorServiceId}", { headers: authorization(accessToken), params: { path: { doctorServiceId } } }));
export const createAvailabilityRule = (accessToken: string, body: components["schemas"]["CreateAvailabilityRuleDto"]) => dataOrThrow<AvailabilityRule>(apiClient.POST("/v1/admin/availability-rules", { headers: authorization(accessToken), body }));
export const updateAvailabilityRule = (accessToken: string, ruleId: string, body: components["schemas"]["UpdateAvailabilityRuleDto"]) => dataOrThrow<AvailabilityRule>(apiClient.PATCH("/v1/admin/availability-rules/{ruleId}", { headers: authorization(accessToken), params: { path: { ruleId } }, body }));
export const deleteAvailabilityRule = (accessToken: string, ruleId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/availability-rules/{ruleId}", { headers: authorization(accessToken), params: { path: { ruleId } } }));
export const createClinicClosure = (accessToken: string, body: components["schemas"]["CreateClinicClosureDto"]) => dataOrThrow<ClinicClosure>(apiClient.POST("/v1/admin/clinic-closures", { headers: authorization(accessToken), body }));
export const updateClinicClosure = (accessToken: string, closureId: string, body: components["schemas"]["UpdateClinicClosureDto"]) => dataOrThrow<ClinicClosure>(apiClient.PATCH("/v1/admin/clinic-closures/{closureId}", { headers: authorization(accessToken), params: { path: { closureId } }, body }));
export const deleteClinicClosure = (accessToken: string, closureId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/clinic-closures/{closureId}", { headers: authorization(accessToken), params: { path: { closureId } } }));
export const createDoctorException = (accessToken: string, body: components["schemas"]["CreateDoctorAvailabilityExceptionDto"]) => dataOrThrow<DoctorException>(apiClient.POST("/v1/admin/doctor-availability-exceptions", { headers: authorization(accessToken), body }));
export const updateDoctorException = (accessToken: string, exceptionId: string, body: components["schemas"]["UpdateDoctorAvailabilityExceptionDto"]) => dataOrThrow<DoctorException>(apiClient.PATCH("/v1/admin/doctor-availability-exceptions/{exceptionId}", { headers: authorization(accessToken), params: { path: { exceptionId } }, body }));
export const deleteDoctorException = (accessToken: string, exceptionId: string) => voidOrThrow(apiClient.DELETE("/v1/admin/doctor-availability-exceptions/{exceptionId}", { headers: authorization(accessToken), params: { path: { exceptionId } } }));

export function directoryMutationMessage(error: unknown): string {
  if (!(error instanceof DirectorySettingsApiError) || error.status === 0) return "ارتباط با سرویس برقرار نشد؛ تغییر ذخیره نشد.";
  if (error.status === 401) return "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.";
  if (error.status === 403) return "اجازهٔ انجام این تغییر را ندارید.";
  if (error.code === "DIRECTORY_NAME_CONFLICT") return "رکوردی با این نام از قبل وجود دارد.";
  if (error.code === "DIRECTORY_PUBLICATION_INVALID") return "پیش‌نیاز انتشار کامل نیست؛ تخصص، پزشک و خدمت باید فعال و منتشرشده باشند.";
  if (error.code === "DOCTOR_SERVICE_CONFLICT") return "این پزشک قبلاً همین خدمت و نوع ویزیت را دارد.";
  if (error.code === "DIRECTORY_RECORD_IN_USE") return "این رکورد در نوبت‌ها یا تنظیمات دیگر استفاده شده و قابل حذف نیست؛ آن را غیرفعال کنید.";
  if (error.code === "AVAILABILITY_INTERVAL_OVERLAP") return "این بازه با برنامهٔ فعال دیگری تداخل دارد.";
  if (error.code === "SCHEDULE_INTERVAL_INVALID") return "بازهٔ زمانی معتبر نیست؛ زمان پایان باید بعد از زمان شروع باشد.";
  if (error.code === "DIRECTORY_INPUT_INVALID" || error.code === "DOCTOR_SERVICE_INPUT_INVALID") return "اطلاعات واردشده کامل یا معتبر نیست.";
  return "ذخیره‌سازی انجام نشد؛ اطلاعات را بررسی و دوباره تلاش کنید.";
}

import { withRequestTimeout } from "@sabz-zendegi/api-client";

export class PatientRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string | null) {
    super(code ?? "PATIENT_REQUEST_FAILED");
  }
}

export async function patientData<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data !== undefined) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new PatientRequestError(response.status, code);
  } catch (error) {
    if (error instanceof PatientRequestError) throw error;
    throw new PatientRequestError(0, null);
  }
}

export const patientAuthorization = (token: string) => ({ authorization: `Bearer ${token}` });

export async function patientEmpty(request: Promise<{ error?: unknown; response: Response }>): Promise<void> {
  try {
    const { response, error } = await withRequestTimeout(request);
    if (response.ok) return;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new PatientRequestError(response.status, code);
  } catch (error) {
    if (error instanceof PatientRequestError) throw error;
    throw new PatientRequestError(0, null);
  }
}

export function patientErrorMessage(error: unknown): string {
  if (error instanceof PatientRequestError && error.code === "COUPLE_POLICY_UNAVAILABLE") return "رضایت‌نامهٔ اتصال زوجین هنوز توسط کلینیک فعال نشده است. پس از فعال‌شدن آن می‌توانید اتصال همراه را ادامه دهید.";
  const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 0;
  if (status === 0) return "ارتباط با سرویس برقرار نشد؛ دوباره تلاش کنید. نتیجهٔ درخواست قبلی هنوز مشخص نیست.";
  if (status === 401) return "نشست شما نیاز به تمدید دارد؛ صفحه را تازه‌سازی کنید.";
  if (status === 403) return "اجازهٔ انجام این درخواست را ندارید.";
  if (status === 404) return "این مورد در دسترس نیست یا دسترسی شما به آن تغییر کرده است.";
  if (status === 409) return "وضعیت اطلاعات یا شرایط تغییر کرده است؛ اطلاعات تازه را دریافت و دوباره بررسی کنید.";
  if (status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.";
  if (status === 400 || status === 422) return "اطلاعات و شرایط لازم را بررسی کنید؛ این درخواست در وضعیت فعلی قابل انجام نیست.";
  return "درخواست انجام نشد؛ دوباره تلاش کنید.";
}

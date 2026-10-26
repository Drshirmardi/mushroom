import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type CommerceDiscount = components["schemas"]["CommerceDiscountResponseDto"];
export type CommerceDiscountInput = components["schemas"]["CreateCommerceDiscountDto"];

export class CommerceDiscountApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null, public readonly fields: string[] = []) {
    super("Commerce discount request failed.");
  }
}

const fieldLabels: Record<string, string> = { code: "کد تخفیف", title: "عنوان", kind: "نوع تخفیف", amountToman: "مبلغ تخفیف", percentageBasisPoints: "درصد تخفیف", startsAt: "زمان شروع", endsAt: "زمان پایان", usageLimit: "سقف کلی", perPatientUsageLimit: "سقف هر بیمار" };

export function commerceDiscountErrorMessage(error: unknown): string {
  if (!(error instanceof CommerceDiscountApiError)) return "ثبت تغییرات انجام نشد. دوباره تلاش کنید.";
  if (error.code === "COMMERCE_DISCOUNT_CODE_CONFLICT") return "این کد تخفیف قبلاً ثبت شده؛ یک کد دیگر انتخاب کنید.";
  if (error.code === "COMMERCE_DISCOUNT_LIMIT_BELOW_USAGE") return "سقف استفاده نمی‌تواند کمتر از تعداد مصرف و رزروهای فعال باشد.";
  if (error.status === 401) return "برای ادامه، دوباره وارد حساب خود شوید.";
  if (error.status === 403) return "حساب شما دسترسی لازم برای مدیریت کدهای تخفیف را ندارد.";
  if (error.status === 0) return "ارتباط با سرور برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.";
  if (error.status === 400 || error.status === 422) {
    const fields = error.fields.map(field => fieldLabels[field]).filter(Boolean);
    return fields.length ? `اطلاعات این بخش‌ها را بررسی کنید: ${fields.join("، ")}.` : "اطلاعات کد تخفیف معتبر نیست؛ کد، مقدار و تاریخ را بررسی کنید.";
  }
  return "ذخیره تغییرات فعلاً انجام نشد. کمی بعد دوباره تلاش کنید.";
}

const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
async function result<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (!response.ok || !data) {
      const body = error && typeof error === "object" ? error : null;
      const code = body && "code" in body && typeof body.code === "string" ? body.code : null;
      const details = body && "details" in body && body.details && typeof body.details === "object" ? body.details : null;
      const fields = details && "fields" in details && Array.isArray(details.fields) ? details.fields.filter((field): field is string => typeof field === "string") : [];
      throw new CommerceDiscountApiError(response.status, code, fields);
    }
    return data;
  } catch (error) {
    if (error instanceof CommerceDiscountApiError) throw error;
    throw new CommerceDiscountApiError(0);
  }
}

export const listCommerceDiscounts = (accessToken: string) => result<CommerceDiscount[]>(apiClient.GET("/v1/admin/commerce/discounts", { headers: headers(accessToken) }));
export const createCommerceDiscount = (accessToken: string, body: CommerceDiscountInput) => result<CommerceDiscount>(apiClient.POST("/v1/admin/commerce/discounts", { headers: headers(accessToken), body }));
export const updateCommerceDiscount = (accessToken: string, discountId: string, body: components["schemas"]["UpdateCommerceDiscountDto"]) => result<CommerceDiscount>(apiClient.PATCH("/v1/admin/commerce/discounts/{discountId}", { headers: headers(accessToken), params: { path: { discountId } }, body }));

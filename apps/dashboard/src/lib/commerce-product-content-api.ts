import { createApiClient, type components } from "@sabz-zendegi/api-client";

import { apiClient } from "./api";

export type AdminProductContent = components["schemas"]["AdminProductContentDto"];
export type ProductContentFields = components["schemas"]["ProductContentFieldsDto"];
export type ProductContentProvenance = components["schemas"]["ProductContentProvenanceDto"];
export type ProductContentStatus = AdminProductContent["status"];
export type ProductContentSourceKind = ProductContentProvenance["sourceKind"];

export class ProductContentApiError extends Error {
  constructor(readonly status: number, readonly code = "") {
    super("Product content request failed.");
  }
}

async function request<T>(promise: Promise<{ data?: T; error?: { code?: string }; response: Response }>): Promise<T> {
  let data: T | undefined;
  let error: { code?: string } | undefined;
  let response: Response;
  try {
    ({ data, error, response } = await promise);
  } catch {
    throw new ProductContentApiError(0);
  }
  if (!response.ok || data === undefined) {
    throw new ProductContentApiError(response.status, error?.code ?? "");
  }
  return data;
}

function headers(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

export function createProductContentApi(client: ReturnType<typeof createApiClient>) {
  return {
    async load(productId: string, accessToken: string): Promise<AdminProductContent> {
      return request<AdminProductContent>(
        client.GET("/v1/admin/commerce/products/{productId}/content", {
          headers: headers(accessToken),
          params: { path: { productId } },
        }),
      );
    },
    async save(
      productId: string,
      accessToken: string,
      body: components["schemas"]["UpdateProductContentDto"],
    ): Promise<AdminProductContent> {
      return request<AdminProductContent>(
        client.PATCH("/v1/admin/commerce/products/{productId}/content", {
          headers: headers(accessToken),
          params: { path: { productId } },
          body,
        }),
      );
    },
    async approve(productId: string, accessToken: string, expectedContentRevision: number): Promise<AdminProductContent> {
      return request<AdminProductContent>(
        client.POST("/v1/admin/commerce/products/{productId}/content/approve", {
          headers: headers(accessToken),
          params: { path: { productId } },
          body: { expectedContentRevision },
        }),
      );
    },
  };
}

export function productContentApi() {
  return createProductContentApi(apiClient);
}

export function productContentErrorMessage(status: number, code = ""): string {
  if (status === 401) return "نشست شما تمدید نشد؛ دوباره وارد حساب شوید.";
  if (status === 403) return "اجازهٔ این عملیات را ندارید.";
  if (status === 404) return "محصول در دسترس نیست یا خارج از فروشگاه شماست.";
  if (status === 409 || code === "COMMERCE_CONTENT_REVISION_CONFLICT") {
    return "نسخهٔ محتوا روی سرور تغییر کرده است؛ نسخهٔ تازه را دریافت کنید و بدون بازنویسی خودکار اقدام کنید.";
  }
  if (status === 413 || code === "PAYLOAD_TOO_LARGE") return "حجم درخواست زیاد است؛ متن‌ها را کوتاه‌تر کنید.";
  if (code === "COMMERCE_CONTENT_SOURCE_REQUIRED") return "برای تأیید، نوع و مرجع منبع باید هر دو کامل باشند.";
  if (code === "COMMERCE_CONTENT_INVALID" || status === 422) return "محتوای معتبر نیست؛ فیلدها و منبع را بازبینی کنید.";
  if (status === 400) return "درخواست نامعتبر است؛ قالب ورودی‌ها را بررسی کنید.";
  if (status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.";
  if (status === 0 || status >= 500) return "سرویس در دسترس نیست؛ دوباره تلاش کنید.";
  return "نتیجهٔ درخواست مشخص نیست؛ وضعیت ذخیره‌شده را بررسی کنید.";
}

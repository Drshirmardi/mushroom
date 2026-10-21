import { createApiClient, type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiClient } from "./api";

export type ProductImage = components["schemas"]["ProductImageDto"];
export type ImageRevision = { image: ProductImage | null; etag: string };
export type ImageOperation = { etag: string; key: string };
export class ProductImageApiError extends Error {
  constructor(readonly status: number, readonly code = "") { super("Product image request failed."); }
}

export function createProductImageApi(client: ReturnType<typeof createApiClient>, token: () => Promise<string | null>) {
  async function headers() {
    const value = await token();
    if (!value) throw new ProductImageApiError(401);
    return { authorization: `Bearer ${value}` };
  }
  return {
    async metadata(productId: string, signal?: AbortSignal): Promise<ImageRevision> {
      try {
        const { data, error, response } = await withRequestTimeout(client.GET("/v1/admin/commerce/products/{productId}/image", { headers: await headers(), params: { path: { productId } }, signal, cache: "no-store" }));
        if (!response.ok) throw new ProductImageApiError(response.status, error?.code);
        const etag = response.headers.get("etag");
        if (!etag || data === undefined) throw new ProductImageApiError(0, "IMAGE_CONTRACT_UNAVAILABLE");
        return { image: data, etag };
      } catch (error) { if (error instanceof ProductImageApiError) throw error; throw new ProductImageApiError(0); }
    },
    async preview(productId: string, signal?: AbortSignal): Promise<Blob> {
      try {
        const { data, response } = await withRequestTimeout(client.GET("/v1/admin/commerce/products/{productId}/image/content", { headers: await headers(), params: { path: { productId } }, parseAs: "blob", signal, cache: "no-store" }));
        if (!response.ok || !data) throw new ProductImageApiError(response.status);
        return data;
      } catch (error) { if (error instanceof ProductImageApiError) throw error; throw new ProductImageApiError(0); }
    },
    async remove(productId: string, operation: ImageOperation): Promise<void> {
      try {
        const { error, response } = await withRequestTimeout(client.DELETE("/v1/admin/commerce/products/{productId}/image", { headers: await headers(), params: { path: { productId }, header: { "If-Match": operation.etag, "idempotency-key": operation.key } } }));
        if (response.status !== 204) throw new ProductImageApiError(response.status, error?.code);
      } catch (error) { if (error instanceof ProductImageApiError) throw error; throw new ProductImageApiError(0); }
    },
  };
}

export function productImageApi(token: () => Promise<string | null>) { return createProductImageApi(apiClient, token); }

export function imageErrorMessage(status: number, code = "") {
  if (status === 401) return "نشست شما تمدید نشد؛ دوباره وارد حساب شوید.";
  if (status === 403) return "اجازهٔ مدیریت تصویر این محصول را ندارید.";
  if (status === 404) return "محصول یا تصویر دیگر در دسترس نیست.";
  if (code === "COMMERCE_IMAGE_OPERATION_PENDING") return "عملیات قبلی هنوز در حال بررسی است؛ وضعیت را دوباره دریافت کنید.";
  if (status === 409 || status === 412) return "تصویر یا وضعیت عملیات تغییر کرده است؛ نسخهٔ تازه را بررسی کنید و برای تغییر دوباره اقدام کنید.";
  if (status === 413) return "حجم تصویر باید حداکثر ۵ مگابایت باشد.";
  if (status === 422) return "تصویر معتبر نیست؛ فقط JPEG، PNG و WebP غیرمتحرک پذیرفته می‌شود.";
  if (status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.";
  if (code === "COMMERCE_IMAGE_BUSY") return "پردازش تصویر مشغول است؛ کمی بعد دوباره تلاش کنید.";
  if (status === 503) return "سرویس تصویر غیرفعال یا در دسترس نیست؛ وضعیت ذخیره‌سازی را بررسی کنید.";
  return "نتیجهٔ درخواست مشخص نیست؛ ابتدا وضعیت ذخیره‌شده را بررسی کنید.";
}

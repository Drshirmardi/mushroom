import { withRequestTimeout, type components } from "@sabz-zendegi/api-client";
import { apiBaseUrl, apiClient } from "./api";

export type AdminBanner = components["schemas"]["AdminBannerDto"];
export type BannerMediaOperation = { etag: string; key: string };
export class ContentBannerApiError extends Error {
  constructor(readonly status: number, readonly code: string | null = null) { super(code ?? "CONTENT_BANNER_REQUEST_FAILED"); }
}
const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
async function result<T>(request: Promise<{ data?: T; response: Response; error?: unknown }>): Promise<T> {
  try {
    const value = await withRequestTimeout(request);
    if (value.response.ok && value.data !== undefined) return value.data;
    const error = value.error;
    throw new ContentBannerApiError(value.response.status, error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null);
  } catch (error) { if (error instanceof ContentBannerApiError) throw error; throw new ContentBannerApiError(0); }
}
export const bannerUploadEndpoint = (id: string) => new URL(`/v1/admin/content/banners/${encodeURIComponent(id)}/image`, apiBaseUrl).toString();
export const listAdminBanners = (token: string) => result(apiClient.GET("/v1/admin/content/banners", { headers: headers(token), cache: "no-store", signal: AbortSignal.timeout(10000) }));
export const createBanner = (token: string, body: components["schemas"]["CreateBannerDto"]) => result(apiClient.POST("/v1/admin/content/banners", { headers: headers(token), body, signal: AbortSignal.timeout(10000) }));
export const updateBanner = (token: string, id: string, body: components["schemas"]["UpdateBannerDto"], etag: string) => result(apiClient.PATCH("/v1/admin/content/banners/{id}", { headers: headers(token), params: { path: { id }, header: { "If-Match": etag } }, body, signal: AbortSignal.timeout(10000) }));
export async function previewBannerMedia(token: string, id: string, signal?: AbortSignal): Promise<Blob> {
  return result(apiClient.GET("/v1/admin/content/banners/{bannerId}/image/content", { headers: headers(token), params: { path: { bannerId: id } }, parseAs: "blob", cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }));
}
export async function removeBannerMedia(token: string, id: string, operation: BannerMediaOperation): Promise<void> {
  try {
    const { response } = await withRequestTimeout(apiClient.DELETE("/v1/admin/content/banners/{bannerId}/image", { headers: headers(token), params: { path: { bannerId: id }, header: { "If-Match": operation.etag, "Idempotency-Key": operation.key } }, signal: AbortSignal.timeout(10000) }));
    if (response.status !== 204) throw new ContentBannerApiError(response.status);
  } catch (error) { if (error instanceof ContentBannerApiError) throw error; throw new ContentBannerApiError(0); }
}
export function bannerErrorMessage(status: number, code: string | null = null) {
  if (status === 401) return "نشست شما تمدید نشد؛ دوباره وارد حساب شوید.";
  if (status === 403) return "اجازهٔ مدیریت بنرها را ندارید.";
  if (status === 404) return "بنر دیگر در دسترس نیست.";
  if ([409, 412, 428].includes(status)) return "بنر تغییر کرده است؛ بازخوانی کنید و پیش از ذخیره، نسخهٔ تازه را بررسی کنید.";
  if (status === 400 || code === "CONTENT_INVALID") return "عنوان یا لینک معتبر نیست؛ لینک داخلی مثل /store یا آدرس کامل http و https وارد کنید.";
  if (status === 413 || status === 422) return "تصویر معتبر نیست؛ فقط JPEG، PNG و WebP با حداکثر ۵ مگابایت.";
  if (status === 429) return "درخواست‌ها زیاد شده‌اند؛ کمی بعد دوباره تلاش کنید.";
  if (status === 503 || code === "CONTENT_MEDIA_UNAVAILABLE") return "سرویس ذخیره‌سازی تصویر در دسترس نیست.";
  if (status === 0) return "نتیجهٔ درخواست مشخص نیست؛ وضعیت را بازخوانی کنید.";
  return "درخواست انجام نشد؛ دوباره تلاش کنید.";
}

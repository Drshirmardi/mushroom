import { browserAnalyticsEvent } from '../../../../config/analytics-browser';
import { type components, withRequestTimeout } from '@sabz-zendegi/api-client';

import { apiClient, apiBaseUrl, sessionFetch } from './api';
import { PATIENT_CATALOG_TTL_MS, patientCacheKey, patientCachedData } from './patient-request';

export type CommerceProduct = components['schemas']['PatientCommerceProductDto'];
export type CommerceCart = components['schemas']['PatientCartDto'];
export type CommerceWishlist = components['schemas']['PatientWishlistDto'];
export type CommerceAddress = components['schemas']['CommerceAddressDto'];
export type CommerceShippingOption = components['schemas']['CommerceShippingOptionDto'];
export type CommerceOrder = components['schemas']['CommerceOrderDto'];
export type CommerceReceipt = components['schemas']['PatientCommerceReceiptDto'];
export type PaymentAttempt = components['schemas']['PaymentAttemptDto'];
export type CommerceRecommendations = components['schemas']['PatientCommerceRecommendationsDto'];

export class CommerceRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null = null,
    public readonly reason: string | null = null,
  ) {
    super(code ?? 'COMMERCE_REQUEST_FAILED');
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function expectData<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : null;
    const details =
      error &&
      typeof error === 'object' &&
      'details' in error &&
      error.details &&
      typeof error.details === 'object'
        ? error.details
        : null;
    const reason =
      details && 'reason' in details && typeof details.reason === 'string' ? details.reason : null;
    throw new CommerceRequestError(response.status, code, reason);
  } catch (error) {
    if (error instanceof CommerceRequestError) throw error;
    throw new CommerceRequestError(0);
  }
}

export function commerceProductsCacheKey(query?: {
  page?: number;
  pageSize?: number;
  query?: string;
  categoryId?: string;
}) {
  return patientCacheKey(
    'public',
    `commerce-products:${query?.page ?? ''}:${query?.pageSize ?? ''}:${query?.query ?? ''}:${query?.categoryId ?? ''}`,
  );
}

export const listCommerceProducts = (query?: {
  page?: number;
  pageSize?: number;
  query?: string;
  categoryId?: string;
}) =>
  patientCachedData(commerceProductsCacheKey(query), PATIENT_CATALOG_TTL_MS, () =>
    expectData<components['schemas']['PatientCommerceProductPageDto']>(
      apiClient.GET('/v1/commerce/products', { params: { query } }),
    ),
  );

export const getCommerceProduct = (productId: string) =>
  expectData<CommerceProduct>(
    apiClient.GET('/v1/commerce/products/{productId}', { params: { path: { productId } } }),
  );

export const getCommerceRecommendations = (accessToken: string, submissionId?: string) =>
  expectData<CommerceRecommendations>(
    apiClient.GET('/v1/patients/me/commerce/recommendations', {
      headers: authorization(accessToken),
      params: { query: { submissionId } },
      cache: 'no-store',
    }),
  );

export const getCommerceCart = (accessToken: string) =>
  expectData<CommerceCart>(
    apiClient.GET('/v1/patients/me/cart', { headers: authorization(accessToken) }),
  );

export const updateCommerceCart = (accessToken: string, skuId: string, quantity: number) =>
  expectData<CommerceCart>(
    apiClient.PUT('/v1/patients/me/cart', {
      headers: authorization(accessToken),
      body: { skuId, quantity },
    }),
  ).then((cart) => {
    browserAnalyticsEvent('cart_quantity_set', { item_id: skuId, quantity, surface: 'app' });
    return cart;
  });

export const getCommerceWishlist = (accessToken: string) =>
  expectData<CommerceWishlist>(
    apiClient.GET('/v1/patients/me/wishlist', { headers: authorization(accessToken) }),
  );

export const updateCommerceWishlist = (accessToken: string, skuId: string, saved: boolean) =>
  expectData<CommerceWishlist>(
    apiClient.PUT('/v1/patients/me/wishlist', {
      headers: authorization(accessToken),
      body: { skuId, saved },
    }),
  );

export const getCommerceAddresses = (accessToken: string) =>
  expectData<CommerceAddress[]>(
    apiClient.GET('/v1/patients/me/commerce/addresses', { headers: authorization(accessToken) }),
  );

export const createCommerceAddress = (
  accessToken: string,
  body: components['schemas']['CreateCommerceAddressDto'],
) =>
  expectData<CommerceAddress>(
    apiClient.POST('/v1/patients/me/commerce/addresses', {
      headers: authorization(accessToken),
      body,
    }),
  );

export const updateCommerceAddress = (
  accessToken: string,
  addressId: string,
  body: components['schemas']['UpdateCommerceAddressDto'],
) =>
  expectData<CommerceAddress>(
    apiClient.PATCH('/v1/patients/me/commerce/addresses/{addressId}', {
      headers: authorization(accessToken),
      params: { path: { addressId } },
      body,
    }),
  );

export const getCommerceShippingOptions = (accessToken: string) =>
  expectData<CommerceShippingOption[]>(
    apiClient.GET('/v1/patients/me/commerce/shipping-options', {
      headers: authorization(accessToken),
    }),
  );

export type CommerceDiscountPreview = {
  code: string;
  subtotalAmountToman: string;
  taxAmountToman: string;
  discountAmountToman: string;
};

export const previewCommerceDiscount = (accessToken: string, discountCode: string) =>
  expectData<CommerceDiscountPreview>(
    (async () => {
      const response = await sessionFetch(
        new URL('/v1/patients/me/commerce/discount-preview', apiBaseUrl),
        {
          method: 'POST',
          headers: { ...authorization(accessToken), 'content-type': 'application/json' },
          body: JSON.stringify({ discountCode }),
          cache: 'no-store',
        },
      );
      const body = await response.json();
      return response.ok
        ? { response, data: body as CommerceDiscountPreview }
        : { response, error: body as unknown };
    })(),
  );

export const checkoutCommerceOrder = (
  accessToken: string,
  idempotencyKey: string,
  body: components['schemas']['CheckoutCommerceOrderDto'],
) =>
  expectData<CommerceOrder>(
    apiClient.POST('/v1/patients/me/orders', {
      headers: { ...authorization(accessToken), 'idempotency-key': idempotencyKey },
      body,
    }),
  );

export const getCommerceOrders = (accessToken: string) =>
  expectData<CommerceOrder[]>(
    apiClient.GET('/v1/patients/me/orders', { headers: authorization(accessToken) }),
  );

export const getCommerceOrder = (accessToken: string, orderId: string) =>
  expectData<CommerceOrder>(
    apiClient.GET('/v1/patients/me/orders/{orderId}', {
      headers: authorization(accessToken),
      params: { path: { orderId } },
    }),
  );

export const getCommerceReceipt = (accessToken: string, orderId: string) =>
  expectData<CommerceReceipt>(
    apiClient.GET('/v1/patients/me/orders/{orderId}/receipt', {
      headers: authorization(accessToken),
      params: { path: { orderId } },
    }),
  );

export const createPaymentAttempt = (
  accessToken: string,
  orderId: string,
  idempotencyKey: string,
) =>
  expectData<PaymentAttempt>(
    apiClient.POST('/v1/patients/me/orders/{orderId}/payment-attempts', {
      headers: { ...authorization(accessToken), 'idempotency-key': idempotencyKey },
      params: { path: { orderId } },
    }),
  );

export const getPaymentAttempt = (accessToken: string, attemptId: string) =>
  expectData<PaymentAttempt>(
    apiClient.GET('/v1/patients/me/payment-attempts/{attemptId}', {
      headers: authorization(accessToken),
      params: { path: { attemptId } },
    }),
  );

export function commerceErrorMessage(error: unknown) {
  if (!(error instanceof CommerceRequestError) || error.status === 0)
    return 'سرویس فروشگاه در دسترس نیست؛ دوباره تلاش کنید.';
  if (error.code === 'COMMERCE_INVENTORY_INSUFFICIENT')
    return 'موجودی یک یا چند کالای سبد کافی نیست؛ سبد را بررسی کنید.';
  if (error.code === 'COMMERCE_CART_EMPTY') return 'سبد خرید شما خالی است.';
  if (error.code === 'COMMERCE_SKU_NOT_FOUND')
    return 'یکی از کالاهای سبد دیگر در دسترس نیست؛ سبد را بررسی کنید.';
  if (error.code === 'SHIPPING_METHOD_UNAVAILABLE') return 'روش ارسال انتخاب‌شده در دسترس نیست.';
  if (error.code === 'IDEMPOTENCY_KEY_REUSED')
    return 'این درخواست با اطلاعات دیگری قبلاً ثبت شده است؛ صفحه را تازه‌سازی کنید.';
  if (
    error.code === 'COMMERCE_DISCOUNT_NOT_FOUND' ||
    error.code === 'COMMERCE_DISCOUNT_INPUT_INVALID'
  )
    return 'کد تخفیف معتبر نیست؛ کد را بررسی کنید یا بدون کد ادامه دهید.';
  if (error.code === 'COMMERCE_DISCOUNT_UNAVAILABLE' && error.reason === 'EXPIRED')
    return 'مهلت استفاده از این کد تخفیف تمام شده است.';
  if (error.code === 'COMMERCE_DISCOUNT_UNAVAILABLE' && error.reason === 'NOT_STARTED')
    return 'زمان استفاده از این کد تخفیف هنوز شروع نشده است.';
  if (error.code === 'COMMERCE_DISCOUNT_UNAVAILABLE' && error.reason === 'INACTIVE')
    return 'این کد تخفیف غیرفعال شده است.';
  if (error.code === 'COMMERCE_DISCOUNT_PATIENT_LIMIT_REACHED')
    return 'سقف استفاده شما از این کد پر شده یا برای یک سفارش پرداخت‌نشده رزرو شده است.';
  if (error.code === 'COMMERCE_DISCOUNT_USAGE_LIMIT_REACHED')
    return 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.';
  if (error.code?.startsWith('COMMERCE_DISCOUNT_'))
    return 'این کد تخفیف در حال حاضر برای این سفارش قابل استفاده نیست؛ کد را حذف کنید یا کد دیگری وارد کنید.';
  if (error.status === 401) return 'نشست شما منقضی شده است؛ دوباره وارد حساب شوید.';
  if (error.status === 403) return 'اجازهٔ انجام این عملیات فروشگاه را ندارید.';
  if (error.status === 404) return 'این محصول دیگر در دسترس نیست.';
  if (error.status === 422) return 'مقدار واردشده معتبر نیست.';
  return 'درخواست فروشگاه انجام نشد؛ دوباره تلاش کنید.';
}

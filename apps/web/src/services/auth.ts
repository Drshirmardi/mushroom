import { createApiClient, type components } from "@sabz-zendegi/api-client";

import { apiClient } from "../lib/api";

export interface LoginPayload {
    phone: string;
    password: string;
    remember: boolean;
}

export interface SignupPayload {
    phone: string;
    password: string;
}

export type AuthResult =
    | { ok: true; roles: components["schemas"]["AuthenticationResponseDto"]["user"]["roles"] }
    | { ok: false; message: string };

export type OtpChallenge = components["schemas"]["OtpChallengeResponseDto"];
export type OtpChallengeResult = { ok: true; challenge: OtpChallenge } | { ok: false; message: string };

type ApiClient = ReturnType<typeof createApiClient>;
type ApiError = components["schemas"]["ApiErrorResponseDto"];

const messages: Record<string, string> = {
    INVALID_CREDENTIALS: "شماره موبایل یا رمز عبور اشتباه است.",
    LOGIN_RATE_LIMITED: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره امتحان کنید.",
    TOO_MANY_REQUESTS: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره امتحان کنید.",
    PHONE_ALREADY_REGISTERED: "این شماره موبایل قبلاً ثبت‌نام کرده است؛ می‌توانید وارد شوید.",
    INVALID_PHONE_NUMBER: "شماره موبایل معتبر نیست.",
    PASSWORD_TOO_SHORT: "رمز عبور کوتاه‌تر از حد مجاز است.",
    PASSWORD_TOO_LONG: "رمز عبور طولانی‌تر از حد مجاز است.",
    PASSWORD_UNSUPPORTED_CHARACTERS: "رمز عبور دارای نویسه پشتیبانی‌نشده است.",
    PASSWORD_BLOCKED: "این رمز عبور قابل استفاده نیست؛ رمز دیگری انتخاب کنید.",
    ORIGIN_NOT_ALLOWED: "امکان ارتباط امن با سرویس وجود ندارد.",
    SERVICE_UNAVAILABLE: "سرویس موقتاً در دسترس نیست؛ کمی بعد دوباره امتحان کنید.",
    OTP_DISABLED: "ورود با کد یک‌بارمصرف موقتاً غیرفعال است؛ از رمز عبور استفاده کنید.",
    SMS_TRANSPORT_DISABLED: "ارسال پیامک در این محیط هنوز فعال نشده است.",
    SMS_PROVIDER_UNAVAILABLE: "درگاه پیامک آماده نیست؛ از رمز عبور استفاده کنید یا کمی بعد تلاش کنید.",
    OTP_DELIVERY_UNAVAILABLE: "ارسال کد انجام نشد؛ کمی بعد دوباره امتحان کنید.",
    OTP_RATE_LIMITED: "تعداد درخواست کد زیاد است؛ پس از چند دقیقه دوباره تلاش کنید.",
    OTP_RESEND_COOLDOWN: "برای ارسال دوباره کمی صبر کنید.",
    OTP_INVALID: "کد واردشده درست نیست یا قبلاً استفاده شده است.",
    OTP_EXPIRED: "زمان اعتبار کد تمام شده است؛ کد تازه بگیرید.",
    OTP_ATTEMPTS_EXHAUSTED: "تعداد تلاش‌ها تمام شد؛ کد تازه بگیرید.",
    OTP_ACCOUNT_PROVISIONING_UNAVAILABLE: "ساخت حساب در این لحظه ممکن نیست؛ کمی بعد دوباره تلاش کنید.",
    IDEMPOTENCY_KEY_INVALID: "درخواست معتبر نبود؛ صفحه را دوباره بارگذاری و تلاش کنید.",
};

function errorMessage(error: ApiError | undefined): string {
    if (!error) {
        return "ارتباط با سرویس برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.";
    }

    return messages[error.code] ?? "در انجام درخواست خطایی رخ داد؛ دوباره امتحان کنید.";
}

export function createAuthService(client: ApiClient) {
    return {
        async login(payload: LoginPayload): Promise<AuthResult> {
            try {
                const { data, error } = await client.POST("/v1/auth/login", {
                    body: payload,
                });

                if (!data) {
                    return { ok: false, message: errorMessage(error) };
                }

                return { ok: true, roles: data.user.roles };
            } catch {
                return { ok: false, message: errorMessage(undefined) };
            }
        },

        async signup(payload: SignupPayload): Promise<AuthResult> {
            try {
                const { data, error } = await client.POST("/v1/auth/register", {
                    body: payload,
                });

                return data
                    ? { ok: true, roles: data.roles }
                    : { ok: false, message: errorMessage(error) };
            } catch {
                return { ok: false, message: errorMessage(undefined) };
            }
        },
        async requestOtp(payload: { phone: string; remember: boolean }): Promise<OtpChallengeResult> {
            try {
                const { data, error } = await client.POST("/v1/auth/otp/challenges", { headers: { "idempotency-key": crypto.randomUUID() }, body: payload });
                return data ? { ok: true, challenge: data } : { ok: false, message: errorMessage(error) };
            } catch { return { ok: false, message: errorMessage(undefined) }; }
        },
        async resendOtp(challengeId: string): Promise<OtpChallengeResult> {
            try {
                const { data, error } = await client.POST("/v1/auth/otp/challenges/{challengeId}/resend", { headers: { "idempotency-key": crypto.randomUUID() }, params: { path: { challengeId } } });
                return data ? { ok: true, challenge: data } : { ok: false, message: errorMessage(error) };
            } catch { return { ok: false, message: errorMessage(undefined) }; }
        },
        async verifyOtp(challengeId: string, code: string): Promise<AuthResult> {
            try {
                const { data, error } = await client.POST("/v1/auth/otp/challenges/{challengeId}/verify", { params: { path: { challengeId } }, body: { code } });
                return data ? { ok: true, roles: data.user.roles } : { ok: false, message: errorMessage(error) };
            } catch { return { ok: false, message: errorMessage(undefined) }; }
        },
    };
}

const authService = createAuthService(apiClient);

export const loginWithPhone = authService.login;
export const signupWithPhone = authService.signup;
export const requestOtp = authService.requestOtp;
export const resendOtp = authService.resendOtp;
export const verifyOtp = authService.verifyOtp;

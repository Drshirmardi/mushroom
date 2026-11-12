import { createApiClient, type components } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { createAuthService } from "./auth";

type Authentication = components["schemas"]["AuthenticationResponseDto"];

const authentication: Authentication = {
    accessToken: "access-token",
    tokenType: "Bearer",
    expiresIn: 600,
    user: { id: "user-id", phone: "+989121234567", roles: ["PATIENT"] },
};

function response(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

describe("web auth service", () => {
    it("logs in through the credentialed generated client without retaining authentication", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(authentication, 200));
        const service = createAuthService(createApiClient({ baseUrl: "https://api.example.test", fetch }));

        expect(createAuthService).toHaveLength(1);

        await expect(
            service.login({ phone: "+989121234567", password: "safe-password-long", remember: true }),
        ).resolves.toEqual({ ok: true, roles: ["PATIENT"] });

        const request = fetch.mock.calls[0]?.[0] as Request;
        expect(request.url).toBe("https://api.example.test/v1/auth/login");
        expect(request.credentials).toBe("include");
        expect(await request.clone().json()).toEqual({
            phone: "+989121234567",
            password: "safe-password-long",
            remember: true,
        });
    });

    it("registers with identity fields only and does not create a session", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
            response(
                {
                    id: "user-id",
                    phone: "+989121234567",
                    roles: ["PATIENT"],
                    createdAt: "2026-08-23T00:00:00.000Z",
                },
                201,
            ),
        );
        const service = createAuthService(createApiClient({ baseUrl: "https://api.example.test", fetch }));

        await expect(
            service.signup({ phone: "+989121234567", password: "safe-password-long" }),
        ).resolves.toEqual({ ok: true, roles: ["PATIENT"] });

        const request = fetch.mock.calls[0]?.[0] as Request;
        expect(await request.clone().json()).toEqual({
            phone: "+989121234567",
            password: "safe-password-long",
        });
    });

    it("maps API errors and network failures to actionable Persian messages", async () => {
        const rateLimitedFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
            response(
                {
                    code: "LOGIN_RATE_LIMITED",
                    message: "Login rate limited",
                    requestId: "request-id",
                    details: {},
                },
                429,
            ),
        );
        const rateLimitedService = createAuthService(
            createApiClient({ baseUrl: "https://api.example.test", fetch: rateLimitedFetch }),
        );

        await expect(
            rateLimitedService.login({ phone: "+989121234567", password: "wrong", remember: false }),
        ).resolves.toEqual({
            ok: false,
            code: "LOGIN_RATE_LIMITED",
            message: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره امتحان کنید.",
        });

        const offlineService = createAuthService(
            createApiClient({
                baseUrl: "https://api.example.test",
                fetch: vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error("offline")),
            }),
        );
        await expect(
            offlineService.signup({ phone: "+989121234567", password: "safe-password-long" }),
        ).resolves.toEqual({
            ok: false,
            message: "ارتباط با سرویس برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.",
        });
    });

    it("maps OTP provisioning and idempotency errors", async () => {
        const expectedMessages = [
            ["OTP_ACCOUNT_PROVISIONING_UNAVAILABLE", "ساخت حساب در این لحظه ممکن نیست؛ کمی بعد دوباره تلاش کنید."],
            ["IDEMPOTENCY_KEY_INVALID", "درخواست معتبر نبود؛ صفحه را دوباره بارگذاری و تلاش کنید."],
        ] as const;

        for (const [code, message] of expectedMessages) {
            const service = createAuthService(createApiClient({
                baseUrl: "https://api.example.test",
                fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(response({
                    code,
                    message: "Request failed",
                    requestId: "request-id",
                    details: {},
                }, 503)),
            }));

            await expect(service.login({
                phone: "+989121234567",
                password: "safe-password-long",
                remember: false,
            })).resolves.toEqual({ ok: false, code, message });
        }
    });

    it("requests and verifies OTP through the credentialed public contract", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>()
            .mockResolvedValueOnce(response({ challengeId: "11111111-1111-4111-8111-111111111111", expiresAt: "2026-10-11T10:02:00.000Z", resendAvailableAt: "2026-10-11T10:01:00.000Z", destinationMasked: "+9891***67" }, 201))
            .mockResolvedValueOnce(response(authentication, 200));
        const service = createAuthService(createApiClient({ baseUrl: "https://api.example.test", fetch }));
        const challenge = await service.requestOtp({ phone: "+989121234567", remember: true });
        expect(challenge.ok).toBe(true);
        const first = fetch.mock.calls[0]?.[0] as Request;
        expect(first.headers.get("idempotency-key")).toBeTruthy();
        await expect(service.verifyOtp("11111111-1111-4111-8111-111111111111", "123456")).resolves.toEqual({ ok: true, roles: ["PATIENT"] });
        expect((fetch.mock.calls[1]?.[0] as Request).credentials).toBe("include");
    });
});

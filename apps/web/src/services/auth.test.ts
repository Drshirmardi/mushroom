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
        ).resolves.toEqual({ ok: true });

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
        ).resolves.toEqual({ ok: true });

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
});

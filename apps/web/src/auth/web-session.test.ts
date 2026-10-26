import { createApiClient, type components } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { appUrl, dashboardUrl } from "../lib/api";

import { dashboardUrlFor, WebSessionManager } from "./web-session";

type Authentication = components["schemas"]["AuthenticationResponseDto"];

const patientAuthentication: Authentication = {
    accessToken: "access-token",
    tokenType: "Bearer",
    expiresIn: 600,
    user: { id: "user-id", phone: "+989121234567", roles: ["PATIENT"] },
};

function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

describe("web header session", () => {
    it("uses one credentialed refresh request for concurrent session checks", async () => {
        let finishRequest: ((response: Response) => void) | undefined;
        const pendingResponse = new Promise<Response>((resolve) => {
            finishRequest = resolve;
        });
        const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(pendingResponse);
        const manager = new WebSessionManager(
            createApiClient({ baseUrl: "https://api.example.test", fetch }),
        );

        const first = manager.bootstrap();
        const second = manager.bootstrap();

        await Promise.resolve();
        expect(fetch).toHaveBeenCalledTimes(1);
        finishRequest?.(jsonResponse(patientAuthentication, 200));

        await expect(Promise.all([first, second])).resolves.toEqual([
            { status: "authenticated", authentication: patientAuthentication },
            { status: "authenticated", authentication: patientAuthentication },
        ]);

        const request = fetch.mock.calls[0]?.[0] as Request;
        expect(request.url).toBe("https://api.example.test/v1/auth/refresh");
        expect(request.credentials).toBe("include");
        expect(await request.clone().text()).toBe("");
    });

    it("treats an invalid refresh cookie as anonymous", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(null, { status: 401 }));
        const manager = new WebSessionManager(
            createApiClient({ baseUrl: "https://api.example.test", fetch }),
        );

        await expect(manager.bootstrap()).resolves.toEqual({
            status: "anonymous",
            authentication: null,
        });
    });

    it("reports an unavailable service instead of showing a false logged-out state", async () => {
        vi.useFakeTimers();
        try {
            const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(new Promise<Response>(() => {}));
            const manager = new WebSessionManager(
                createApiClient({ baseUrl: "https://api.example.test", fetch }),
                () => 1_000,
                100,
            );

            const bootstrap = manager.bootstrap();
            await vi.advanceTimersByTimeAsync(100);

            await expect(bootstrap).resolves.toEqual({
                status: "unavailable",
                authentication: null,
            });
        } finally {
            vi.useRealTimers();
        }
    });

    it("retries a refresh race after another response updates the shared cookie", async () => {
        vi.useFakeTimers();
        try {
            const fetch = vi.fn<typeof globalThis.fetch>()
                .mockResolvedValueOnce(jsonResponse({ code: "REFRESH_CONCURRENT_RETRY" }, 409))
                .mockResolvedValueOnce(jsonResponse(patientAuthentication, 200));
            const manager = new WebSessionManager(
                createApiClient({ baseUrl: "https://api.example.test", fetch }),
                () => 1_000,
            );

            const bootstrap = manager.bootstrap();
            await vi.advanceTimersByTimeAsync(250);

            await expect(bootstrap).resolves.toEqual({
                status: "authenticated",
                authentication: patientAuthentication,
            });
            expect(fetch).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it("sends patients to the app and clinic roles to the management dashboard", () => {
        expect(dashboardUrlFor(patientAuthentication)).toBe(appUrl);
        expect(
            dashboardUrlFor({
                ...patientAuthentication,
                user: { ...patientAuthentication.user, roles: ["DOCTOR"] },
            }),
        ).toBe(dashboardUrl);
    });
});

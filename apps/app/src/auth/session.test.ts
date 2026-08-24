import { createApiClient, type components } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionManager } from "./session";

type Authentication = components["schemas"]["AuthenticationResponseDto"];

const authentication: Authentication = {
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

describe("app auth session", () => {
  it("bootstraps concurrent callers with one credentialed, bodyless refresh", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      finishRequest = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(pendingResponse);
    const manager = new AuthSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      () => 1_000,
    );

    const first = manager.bootstrap();
    const second = manager.bootstrap();

    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);
    finishRequest?.(jsonResponse(authentication, 200));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "authenticated", authentication },
      { status: "authenticated", authentication },
    ]);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("https://api.example.test/v1/auth/refresh");
    expect(request.credentials).toBe("include");
    expect(await request.clone().text()).toBe("");
  });

  it("becomes anonymous when refresh cannot establish a session", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse(
        {
          code: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
          requestId: "request-id",
          details: {},
        },
        401,
      ),
    );
    const manager = new AuthSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
    );

    await expect(manager.bootstrap()).resolves.toEqual({
      status: "anonymous",
      authentication: null,
    });
  });

  it("logs out with the memory-only bearer token and clears the snapshot", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(authentication, 200))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const manager = new AuthSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      () => 1_000,
    );

    await manager.bootstrap();
    await expect(manager.logout()).resolves.toBe(true);
    expect(manager.getSnapshot()).toEqual({ status: "anonymous", authentication: null });

    const request = fetch.mock.calls[1]?.[0] as Request;
    expect(request.url).toBe("https://api.example.test/v1/auth/logout");
    expect(request.credentials).toBe("include");
    expect(request.headers.get("authorization")).toBe("Bearer access-token");
  });

  it("keeps the authenticated snapshot when logout fails", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(authentication, 200))
      .mockRejectedValueOnce(new Error("offline"));
    const manager = new AuthSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      () => 1_000,
    );

    await manager.bootstrap();
    await expect(manager.logout()).resolves.toBe(false);
    expect(manager.getSnapshot()).toEqual({ status: "authenticated", authentication });
  });
});

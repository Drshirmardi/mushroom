import { createApiClient, type components } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import {
  canAccessDashboard,
  DashboardSessionManager,
  type Role,
} from "./session";

type Authentication = components["schemas"]["AuthenticationResponseDto"];

function authentication(roles: Role[]): Authentication {
  return {
    accessToken: "access-token",
    tokenType: "Bearer",
    expiresIn: 600,
    user: { id: "user-id", phone: "+989121234567", roles },
  };
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("dashboard auth session", () => {
  it("allows only the ADMIN role", async () => {
    const role: Role = "ADMIN";
    const auth = authentication([role]);
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(jsonResponse(auth, 200));
    const manager = new DashboardSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      () => 1_000,
    );

    await expect(manager.bootstrap()).resolves.toEqual({
      status: "authenticated",
      authentication: auth,
    });
  });

  it.each<Role>(["PATIENT", "DOCTOR", "STAFF"])("rejects the %s role", (role) => {
    expect(canAccessDashboard([role])).toBe(false);
  });

  it("rejects a non-admin mixed-role session and permits a session that includes ADMIN", () => {
    expect(canAccessDashboard(["PATIENT", "STAFF"])).toBe(false);
    expect(canAccessDashboard(["PATIENT", "ADMIN"])).toBe(true);
  });

  it("discards patient authentication instead of exposing dashboard content", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(authentication(["PATIENT"]), 200));
    const manager = new DashboardSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
    );

    await expect(manager.bootstrap()).resolves.toEqual({
      status: "forbidden",
      authentication: null,
    });
  });

  it("discards STAFF refresh authentication without retaining its bearer token", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse(authentication(["STAFF"]), 200));
    const manager = new DashboardSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
    );

    await expect(manager.bootstrap()).resolves.toEqual({
      status: "forbidden",
      authentication: null,
    });
    expect(manager.getSnapshot()).toEqual({
      status: "forbidden",
      authentication: null,
    });
  });

  it("bootstraps concurrent callers with one credentialed, bodyless refresh", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      finishRequest = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(pendingResponse);
    const manager = new DashboardSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      () => 1_000,
    );

    const first = manager.bootstrap();
    const second = manager.bootstrap();
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    finishRequest?.(jsonResponse(authentication(["ADMIN"]), 200));
    await Promise.all([first, second]);

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
    const manager = new DashboardSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
    );

    await expect(manager.bootstrap()).resolves.toEqual({
      status: "anonymous",
      authentication: null,
    });
  });

  it("renews an expired admin token while preserving the authenticated view", async () => {
    let now = 1_000;
    const first = authentication(["ADMIN"]);
    const renewed = { ...first, accessToken: "renewed-token" };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(first, 200))
      .mockResolvedValueOnce(jsonResponse(renewed, 200));
    const manager = new DashboardSessionManager(
      createApiClient({ baseUrl: "https://api.example.test", fetch }),
      () => now,
    );

    await manager.bootstrap();
    const snapshots: string[] = [];
    manager.subscribe(() => snapshots.push(manager.getSnapshot().status));
    now += first.expiresIn * 1_000;

    await expect(manager.bootstrap()).resolves.toEqual({
      status: "authenticated",
      authentication: renewed,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(snapshots).not.toContain("checking");
  });

  it("becomes anonymous when refresh stalls", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(new Promise<Response>(() => {}));
      const manager = new DashboardSessionManager(
        createApiClient({ baseUrl: "https://api.example.test", fetch }),
        () => 1_000,
        100,
      );

      const bootstrap = manager.bootstrap();
      await vi.advanceTimersByTimeAsync(100);

      await expect(bootstrap).resolves.toEqual({
        status: "anonymous",
        authentication: null,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs out with the memory-only bearer token and clears the snapshot", async () => {
    const auth = authentication(["ADMIN"]);
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse(auth, 200))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const manager = new DashboardSessionManager(
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
});

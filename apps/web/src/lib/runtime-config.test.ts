import { afterEach, describe, expect, it, vi } from "vitest";

import { runtimePublicUrl } from "./runtime-config";

describe("runtime public URL", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses the browser host for an unconfigured development URL", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("window", {
      location: { protocol: "http:", hostname: "192.168.1.20" },
      __MUSHROOM_RUNTIME_CONFIG__: {},
    });

    expect(runtimePublicUrl("apiUrl", "http://localhost:3003"))
      .toBe("http://192.168.1.20:3003");
  });

  it("prefers an explicit runtime URL", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("window", {
      location: { protocol: "http:", hostname: "192.168.1.20" },
      __MUSHROOM_RUNTIME_CONFIG__: { apiUrl: "https://api.example.test" },
    });

    expect(runtimePublicUrl("apiUrl", "http://localhost:3003"))
      .toBe("https://api.example.test");
  });
});

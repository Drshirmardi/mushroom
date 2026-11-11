import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PATIENT_CACHE_LIMIT, PATIENT_CATALOG_TTL_MS, clearPatientRequestCache, patientCacheKey, patientCachedData, peekPatientCache } from "./patient-request";

describe("patient request cache", () => {
  beforeEach(() => {
    clearPatientRequestCache();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T12:00:00.000Z"));
  });

  afterEach(() => {
    clearPatientRequestCache();
    vi.useRealTimers();
  });

  it("shares one in-flight request between concurrent callers", async () => {
    let calls = 0;
    let finish: (value: string) => void = () => {};
    const factory = () => {
      calls += 1;
      return new Promise<string>((resolve) => { finish = resolve; });
    };

    const first = patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory);
    const second = patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory);
    expect(calls).toBe(1);
    finish("catalog");
    await expect(first).resolves.toBe("catalog");
    await expect(second).resolves.toBe("catalog");
  });

  it("expires a stored value after the ttl", async () => {
    let calls = 0;
    const factory = () => Promise.resolve(`value-${++calls}`);

    await expect(patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory)).resolves.toBe("value-1");
    vi.setSystemTime(new Date(Date.now() + PATIENT_CATALOG_TTL_MS - 1));
    await expect(patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory)).resolves.toBe("value-1");
    vi.setSystemTime(new Date(Date.now() + 1));
    await expect(patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory)).resolves.toBe("value-2");
    expect(calls).toBe(2);
  });

  it("keeps catalog data separated by access token", async () => {
    const seen: string[] = [];
    const factory = (token: string) => () => {
      seen.push(token);
      return Promise.resolve(token);
    };

    await expect(patientCachedData(patientCacheKey("token-a", "doctors"), PATIENT_CATALOG_TTL_MS, factory("token-a"))).resolves.toBe("token-a");
    await expect(patientCachedData(patientCacheKey("token-b", "doctors"), PATIENT_CATALOG_TTL_MS, factory("token-b"))).resolves.toBe("token-b");
    await expect(patientCachedData(patientCacheKey("token-a", "doctors"), PATIENT_CATALOG_TTL_MS, factory("token-a-again"))).resolves.toBe("token-a");
    expect(seen).toEqual(["token-a", "token-b"]);
    expect(patientCacheKey("token-a", "doctors")).not.toBe(patientCacheKey("token-b", "doctors"));
  });

  it("does not cache a failed request", async () => {
    let calls = 0;
    const factory = () => {
      calls += 1;
      return Promise.reject(new Error("offline"));
    };

    await expect(patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory)).rejects.toThrow("offline");
    await expect(patientCachedData("articles", PATIENT_CATALOG_TTL_MS, factory)).rejects.toThrow("offline");
    expect(calls).toBe(2);
  });

  it("drops a response that finishes after the cache is cleared", async () => {
    let finish: (value: string) => void = () => {};
    const pending = patientCachedData("articles", PATIENT_CATALOG_TTL_MS, () => new Promise<string>((resolve) => { finish = resolve; }));
    clearPatientRequestCache();
    finish("stale");
    await expect(pending).resolves.toBe("stale");

    await expect(patientCachedData("articles", PATIENT_CATALOG_TTL_MS, () => Promise.resolve("fresh"))).resolves.toBe("fresh");
  });

  it("drops the oldest record after the memory limit", async () => {
    for (let index = 0; index <= PATIENT_CACHE_LIMIT; index += 1) {
      await patientCachedData(`entry-${index}`, PATIENT_CATALOG_TTL_MS, () => Promise.resolve(index));
    }
    expect(peekPatientCache("entry-0")).toBeUndefined();
    expect(peekPatientCache(`entry-${PATIENT_CACHE_LIMIT}`)).toBe(PATIENT_CACHE_LIMIT);
  });

  it("reads a fresh value without starting another request", async () => {
    await patientCachedData("articles", PATIENT_CATALOG_TTL_MS, () => Promise.resolve("catalog"));
    expect(peekPatientCache("articles")).toBe("catalog");
    vi.setSystemTime(new Date(Date.now() + PATIENT_CATALOG_TTL_MS));
    expect(peekPatientCache("articles")).toBeUndefined();
  });

  it("bypasses the cache when ttl is zero", async () => {
    let calls = 0;
    const factory = () => Promise.resolve(++calls);

    await expect(patientCachedData("appointments", 0, factory)).resolves.toBe(1);
    await expect(patientCachedData("appointments", 0, factory)).resolves.toBe(2);
  });
});

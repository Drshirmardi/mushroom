import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient, createSessionAwareFetch, DEFAULT_REQUEST_TIMEOUT_MS } from "@sabz-zendegi/api-client";
import { PATIENT_CACHE_LIMIT, PATIENT_CACHE_TTL_MS, clearPatientRequestCache, invalidatePatientResource, patientCacheKey, patientCachedData, patientSessionData, peekPatientCache, subscribePatientResource } from "./patient-request";

it("refreshes the store page without duplicating an in-flight refresh", async () => {
  const key = patientCacheKey("store-test-session", "store-offerings:custom:1");
  await patientSessionData(key, PATIENT_CACHE_TTL_MS.storeCatalog, async () => "old");
  const load = vi.fn(async () => "new");
  const refresh = patientSessionData(key, PATIENT_CACHE_TTL_MS.storeCatalog, load, true);
  expect(patientSessionData(key, PATIENT_CACHE_TTL_MS.storeCatalog, load, true)).toBe(refresh);
  await expect(refresh).resolves.toBe("new");
  await expect(patientSessionData(key, PATIENT_CACHE_TTL_MS.storeCatalog, load)).resolves.toBe("new");
  expect(load).toHaveBeenCalledTimes(1);
  clearPatientRequestCache();
});

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

    const first = patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory);
    const second = patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory);
    expect(calls).toBe(1);
    finish("catalog");
    await expect(first).resolves.toBe("catalog");
    await expect(second).resolves.toBe("catalog");
  });

  it("expires a stored value after the ttl", async () => {
    let calls = 0;
    const factory = () => Promise.resolve(`value-${++calls}`);

    await expect(patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory)).resolves.toBe("value-1");
    vi.setSystemTime(new Date(Date.now() + PATIENT_CACHE_TTL_MS.storeCatalog - 1));
    await expect(patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory)).resolves.toBe("value-1");
    vi.setSystemTime(new Date(Date.now() + 1));
    await expect(patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory)).resolves.toBe("value-2");
    expect(calls).toBe(2);
  });

  it("keeps catalog data separated by access token", async () => {
    const seen: string[] = [];
    const factory = (token: string) => () => {
      seen.push(token);
      return Promise.resolve(token);
    };

    await expect(patientCachedData(patientCacheKey("token-a", "doctors"), PATIENT_CACHE_TTL_MS.storeCatalog, factory("token-a"))).resolves.toBe("token-a");
    await expect(patientCachedData(patientCacheKey("token-b", "doctors"), PATIENT_CACHE_TTL_MS.storeCatalog, factory("token-b"))).resolves.toBe("token-b");
    await expect(patientCachedData(patientCacheKey("token-a", "doctors"), PATIENT_CACHE_TTL_MS.storeCatalog, factory("token-a-again"))).resolves.toBe("token-a");
    expect(seen).toEqual(["token-a", "token-b"]);
    expect(patientCacheKey("token-a", "doctors")).not.toBe(patientCacheKey("token-b", "doctors"));
  });

  it("does not cache a failed request", async () => {
    let calls = 0;
    const factory = () => {
      calls += 1;
      return Promise.reject(new Error("offline"));
    };

    await expect(patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory)).rejects.toThrow("offline");
    await expect(patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, factory)).rejects.toThrow("offline");
    expect(calls).toBe(2);
  });

  it("drops a response that finishes after the cache is cleared", async () => {
    let finish: (value: string) => void = () => {};
    const pending = patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, () => new Promise<string>((resolve) => { finish = resolve; }));
    clearPatientRequestCache();
    finish("stale");
    await expect(pending).resolves.toBe("stale");

    await expect(patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, () => Promise.resolve("fresh"))).resolves.toBe("fresh");
  });

  it("notifies subscribers after removing stale values and detaching older requests", async () => {
    const home = patientCacheKey("session", "home");
    const articles = patientCacheKey("session", "articles");
    const ttl = PATIENT_CACHE_TTL_MS.home;
    await patientCachedData(home, ttl, async () => "old home");
    await patientCachedData(articles, ttl, async () => "articles");
    let finish = (_value: string) => {};
    const stale = patientCachedData(home, ttl, () => new Promise<string>(resolve => { finish = resolve; }), true);
    const fresh = vi.fn(async () => "fresh home");
    const listener = vi.fn(() => { void patientCachedData(home, ttl, fresh); });
    const second = vi.fn(() => { void patientCachedData(home, ttl, fresh); });
    const unsubscribe = subscribePatientResource("home", listener);
    const unsubscribeSecond = subscribePatientResource("home", second);
    try {
      invalidatePatientResource("home");
      expect(listener).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect(fresh).toHaveBeenCalledOnce();
      finish("stale");
      await stale;
      expect(peekPatientCache(home)).toBe("fresh home");
      expect(peekPatientCache(articles)).toBe("articles");
      unsubscribe();
      unsubscribeSecond();
      invalidatePatientResource("home");
      expect(listener).toHaveBeenCalledOnce();
      expect(peekPatientCache(home)).toBeUndefined();
    } finally {
      unsubscribe();
      unsubscribeSecond();
    }
  });

  it("drops the oldest record after the memory limit", async () => {
    for (let index = 0; index <= PATIENT_CACHE_LIMIT; index += 1) {
      await patientCachedData(`entry-${index}`, PATIENT_CACHE_TTL_MS.storeCatalog, () => Promise.resolve(index));
    }
    expect(peekPatientCache("entry-0")).toBeUndefined();
    expect(peekPatientCache(`entry-${PATIENT_CACHE_LIMIT}`)).toBe(PATIENT_CACHE_LIMIT);
  });

  it("reads a fresh value without starting another request", async () => {
    await patientCachedData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, () => Promise.resolve("catalog"));
    expect(peekPatientCache("articles")).toBe("catalog");
    vi.setSystemTime(new Date(Date.now() + PATIENT_CACHE_TTL_MS.storeCatalog));
    expect(peekPatientCache("articles")).toBeUndefined();
  });

  it("joins concurrent retries, aborts the shared request at the deadline and allows a new request", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(input => {
      const { signal } = input as Request;
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    });
    const transport = createSessionAwareFetch(fetch);
    transport.setAccessTokenProvider(async () => "rotated-token");
    const client = createApiClient({ baseUrl: "https://api.example.test", fetch: transport.fetch });
    const load = (signal: AbortSignal) => client.GET("/v1/patients/me/journey", {
      headers: { authorization: "Bearer old-token" }, signal,
    });
    const first = patientSessionData("journey", 0, load);
    const aborted = expect(first).rejects.toMatchObject({ name: "AbortError" });
    expect(patientSessionData("journey", 0, load)).toBe(first);
    await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS);
    await aborted;
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get("authorization")).toBe("Bearer rotated-token");
    expect(request.signal.aborted).toBe(true);
    await expect(patientSessionData("journey", 0, async () => "new")).resolves.toBe("new");
  });

  it("aborts old requests and clears cached data when the session is cleared", async () => {
    await patientSessionData("articles", PATIENT_CACHE_TTL_MS.storeCatalog, async () => "private");
    const pending = patientSessionData("journey", 0, signal => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
    clearPatientRequestCache();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(peekPatientCache("articles")).toBeUndefined();
  });

  it("bypasses the cache when ttl is zero", async () => {
    let calls = 0;
    const factory = () => Promise.resolve(++calls);

    await expect(patientCachedData("appointments", 0, factory)).resolves.toBe(1);
    await expect(patientCachedData("appointments", 0, factory)).resolves.toBe(2);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FollowUpRequestError, createHealthObservation, getMezajResult, getPatientArticle, listNotifications, listPatientArticles, readAllNotifications, updateNotificationPreference } from "./follow-up-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", sessionFetch: fetchMock }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("follow-up API", () => {
  beforeEach(() => fetchMock.mockReset());
  it("uses authenticated persisted health and notification endpoints", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "observation", metric: "PAIN", value: 4 })).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ ok: true })).mockResolvedValueOnce(json({ category: "CONTENT", inAppEnabled: false }));
    await createHealthObservation("token", { metric: "PAIN", value: 4, observedAt: "2026-09-05T00:00:00.000Z" });
    await listNotifications("token");
    await readAllNotifications("token");
    await updateNotificationPreference("token", "CONTENT", false);
    const options = fetchMock.mock.calls.map(([, init]) => init as RequestInit);
    expect(options.every((init) => new Headers(init.headers).get("authorization") === "Bearer token")).toBe(true);
    expect(JSON.parse(options[0].body as string)).toEqual({ metric: "PAIN", value: 4, observedAt: "2026-09-05T00:00:00.000Z" });
    expect(JSON.parse(options[3].body as string)).toEqual({ category: "CONTENT", inAppEnabled: false });
  });
  it("preserves API failures", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "MEZAJ_RESULT_NOT_FOUND" }, 404));
    await expect(listNotifications("token")).rejects.toEqual(expect.objectContaining<Partial<FollowUpRequestError>>({ status: 404, code: "MEZAJ_RESULT_NOT_FOUND" }));
  });
  it("reads the assessment-derived mezaj result and published articles", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "result", resultBand: { label: "BALANCED" }, assessedAt: "2026-09-05T00:00:00.000Z" })).mockResolvedValueOnce(json({ items: [{ id: "article", slug: "sleep", title: "Sleep", category: { id: "category", name: "Wellness", slug: "wellness" } }] })).mockResolvedValueOnce(json({ id: "article", slug: "sleep", title: "Sleep", body: "Published body", category: { id: "category", name: "Wellness", slug: "wellness" } }));
    await expect(getMezajResult("token")).resolves.toEqual(expect.objectContaining({ id: "result" }));
    await expect(listPatientArticles("token")).resolves.toEqual(expect.objectContaining({ items: [expect.objectContaining({ slug: "sleep" })] }));
    await expect(getPatientArticle("token", "sleep")).resolves.toEqual(expect.objectContaining({ body: "Published body" }));
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["https://api.example.test/v1/patients/me/mezaj", "https://api.example.test/v1/patients/me/articles", "https://api.example.test/v1/patients/me/articles/sleep"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDashboardArticle, listContentCategories, listDashboardArticles, listDashboardNotifications } from "./phase-08-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test" }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Phase 08 dashboard API", () => {
  beforeEach(() => fetchMock.mockReset());
  it("uses authorized dashboard notification and content endpoints", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ id: "article" }, 201));
    await listDashboardNotifications("token"); await listContentCategories("token"); await listDashboardArticles("token"); await createDashboardArticle("token", { slug: "article", title: "Article", summary: "Summary", body: "Body", categoryId: "category", publicationStatus: "DRAFT" });
    const calls = fetchMock.mock.calls; expect(calls.map(([url]) => String(url))).toEqual(["https://api.example.test/v1/admin/notifications", "https://api.example.test/v1/admin/content/categories", "https://api.example.test/v1/admin/content/articles", "https://api.example.test/v1/admin/content/articles"]); expect(calls.every(([, init]) => new Headers((init as RequestInit).headers).get("authorization") === "Bearer token")).toBe(true); expect(JSON.parse((calls[3][1] as RequestInit).body as string)).toEqual(expect.objectContaining({ publicationStatus: "DRAFT" }));
  });
});

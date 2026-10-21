import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminBanner } from "../../lib/content-banners-api";

vi.mock("../../components/auth/dashboard-session-gate", () => ({
  getDashboardAccessToken: async () => "token",
  useDashboardSession: () => ({ authentication: { accessToken: "token" } }),
}));
vi.mock("@uppy/react", () => ({
  UppyContextProvider: ({ children }: { children: unknown }) => children,
  useDropzone: () => ({ getRootProps: () => ({}), getInputProps: () => ({}) }),
}));

import { BannerEditor } from "./banner-manager";

const base = { etag: '"'+"a".repeat(64)+'"', clinicId: "clinic", destinationUrl: null, publishedAt: null, mediaContentType: null, mediaSizeBytes: null, createdAt: "", updatedAt: "2026-01-01T00:00:00.000Z", contentPath: null };
const published: AdminBanner = { ...base, id: "b1", title: "بنر بهار", publicationStatus: "PUBLISHED", mediaObjectKey: "content/b1/banner.webp", mediaContentType: "image/webp", mediaSizeBytes: 1000, contentPath: "/v1/content/banners/b1/image" };
const draftNoMedia: AdminBanner = { ...base, id: "b2", title: "بنر خالی", publicationStatus: "DRAFT", mediaObjectKey: null };
const draftWithMedia: AdminBanner = { ...base, id: "b3", title: "بنر پیش‌نویس", publicationStatus: "DRAFT", mediaObjectKey: "content/b3/banner.webp", contentPath: "/v1/content/banners/b3/image" };

const render = (banner: AdminBanner) => renderToStaticMarkup(createElement(BannerEditor, { banner, accessToken: "token", onRefresh: async () => {} }));

describe("Banner editor", () => {
  it("renders the selected banner with a live preview and its fields", () => {
    const html = render(published);
    expect(html).toContain('value="بنر بهار"');
    expect(html).toContain('aria-label="بنر بهار"');
    expect(html).toContain("منتشرشده");
    expect(html).toContain("لغو انتشار");
    expect(html).not.toContain("تغییرات ذخیره‌نشده");
  });

  it("signals that a banner without media will not be shown", () => {
    const html = render(draftNoMedia);
    expect(html).toContain("پیش‌نویس");
    expect(html).toContain("بنر بدون تصویر در فروشگاه دیده نمی‌شود");
  });

  it("offers publish for a draft that has media", () => {
    const html = render(draftWithMedia);
    expect(html).toContain("انتشار");
    expect(html).not.toContain("لغو انتشار");
  });
});

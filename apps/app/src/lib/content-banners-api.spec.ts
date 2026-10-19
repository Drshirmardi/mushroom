import { describe, expect, it } from "vitest";
import { safeBannerHref, storeBannerImageUrl } from "./content-banners-api";

describe("public banner navigation and image boundaries", () => {
  it.each(['/store', '/store/products/p?x=1', 'https://example.test/path', 'http://example.test'])('allows the supported destination %s', href => expect(safeBannerHref(href)).toBe(href));
  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.test', '/\\evil.test', 'https://user:password@evil.test', ' https://evil.test', 'https://good.test\nevil', 'ftp://example.test'])('rejects unsafe destination %s', href => expect(safeBannerHref(href)).toBeNull());
  it('does not load arbitrary external or foreign banner image URLs', () => {
    const row = { id: 'b1', title: 'Banner', destinationUrl: null, contentPath: '/v1/content/banners/b1/image' };
    expect(storeBannerImageUrl(row)).toMatch(/\/v1\/content\/banners\/b1\/image$/u);
    expect(storeBannerImageUrl({ ...row, contentPath: 'https://evil.test/tracking' })).toBeNull();
    expect(storeBannerImageUrl({ ...row, contentPath: '/v1/content/banners/b2/image' })).toBeNull();
  });
});

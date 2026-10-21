import { afterEach, describe, expect, it, vi } from "vitest";
import { generateMetadata } from "../app/(public)/store/products/[id]/layout";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("public product metadata", () => {
  it("uses public product text and an absolute catalog image without patient headers", async () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.example.test");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: "محصول سلامت", shortDescription: "توضیح منتشرشده", image: { contentPath: "/v1/commerce/products/p/images/i" } })));
    vi.stubGlobal("fetch", request);
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "p" }) });
    expect(metadata.title).toBe("محصول سلامت | سبز زندگی");
    expect(metadata.description).toBe("توضیح منتشرشده");
    expect(metadata.openGraph?.images).toEqual([{ url: "https://api.example.test/v1/commerce/products/p/images/i" }]);
    expect(request.mock.calls[0][1].headers).toBeUndefined();
  });
  it("keeps the storefront usable when metadata lookup fails", async () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("unavailable")));
    expect((await generateMetadata({ params: Promise.resolve({ id: "p" }) })).title).toBe("محصولات سلامت | سبز زندگی");
  });
  it("does not guess a localhost API in production", async () => {
    vi.stubEnv("PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await generateMetadata({ params: Promise.resolve({ id: "p" }) });
    expect(request).not.toHaveBeenCalled();
  });
});

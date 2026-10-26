import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@sabz-zendegi/api-client";
import { DashboardSessionManager } from "../../auth/session";
import { ProductImageApiError, type ImageOperation, type ProductImage } from "../../lib/commerce-product-image-api";
import { ProductImageController, type ImageEditorDependencies } from "./product-image-controller";

class TestXHR {
  static requests: TestXHR[] = [];
  static reply: (xhr: TestXHR) => void = xhr => xhr.respond(200, {});
  headers = new Headers(); method = ""; url = ""; status = 0; statusText = ""; responseText = ""; responseType = ""; withCredentials = false;
  body: FormData | null = null; aborted = false;
  onload: (() => void) | null = null; onerror: (() => void) | null = null;
  timeout = 0; ontimeout: ((event: Event) => void) | null = null;
  upload = { onprogress: null as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
  open(method: string, url: string) { this.method = method; this.url = url; }
  setRequestHeader(name: string, value: string) { this.headers.set(name, value); }
  send(body: FormData) { this.body = body; TestXHR.requests.push(this); queueMicrotask(() => TestXHR.reply(this)); }
  abort() { this.aborted = true; }
  respond(status: number, body: unknown) { this.status = status; this.responseText = JSON.stringify(body); this.onload?.(); }
  fail() { this.status = 0; this.onerror?.(); }
  progress(loaded: number, total: number) { this.upload.onprogress?.({ lengthComputable: true, loaded, total }); }
}
const image = (id = "image-1"): ProductImage => ({ id, contentPath: "/v1/admin/commerce/products/p/image/content", mimeType: "image/webp", sizeBytes: 20, width: 20, height: 10, altText: "تصویر" });
const instances: ProductImageController[] = [];
function setup(productId = "product-1", initial: ProductImage | null = null) {
  let current = initial;
  const api = {
    metadata: vi.fn(async () => ({ image: current, etag: current ? `"${current.id}"` : '"none"' })),
    preview: vi.fn(async () => new Blob(["webp"], { type: "image/webp" })),
    remove: vi.fn(async (productId: string, operation: ImageOperation) => { expect(productId).toBeTruthy(); expect(operation.key).toBeTruthy(); current = null; }),
  };
  let key = 0; let url = 0;
  const deps: ImageEditorDependencies = { api, token: vi.fn(async () => "current-token"), endpoint: `https://api.test/v1/admin/commerce/products/${productId}/image`, changed: vi.fn(async () => {}), createUrl: vi.fn(() => `blob:test-${++url}`), revokeUrl: vi.fn(), key: () => `intent-${++key}` };
  const controller = new ProductImageController(productId, deps); instances.push(controller);
  return { controller, deps, api, setCurrent: (value: ProductImage | null) => { current = value; } };
}
const select = (controller: ProductImageController, name = "photo.png") => controller.uppy.addFile({ name, type: "image/png", data: new File(["image"], name, { type: "image/png" }) });
describe("Store image uploader with real Uppy XHR transport and deterministic responses", () => {
  beforeEach(() => { TestXHR.requests = []; TestXHR.reply = xhr => xhr.respond(200, {}); vi.stubGlobal("XMLHttpRequest", TestXHR); });
  afterEach(() => { instances.splice(0).forEach(controller => controller.dispose()); vi.unstubAllGlobals(); });

  it("loads the empty-image state without a preview request", async () => {
    const { controller, api } = setup(); await controller.load();
    expect(controller.snapshot()).toMatchObject({ phase: "ready", image: null, etag: '"none"' });
    expect(api.preview).not.toHaveBeenCalled();
  });
  it("sends exactly file/altText, quoted precondition and authorization; confirms and invalidates", async () => {
    const { controller, deps, setCurrent } = setup(); await controller.load(); select(controller); controller.setAltText("عکس محصول");
    TestXHR.reply = xhr => { setCurrent(image()); xhr.respond(200, image()); };
    await controller.upload();
    const request = TestXHR.requests[0];
    expect(request.method).toBe("PUT"); expect(request.url).toContain("product-1/image");
    expect(request.headers.get("if-match")).toBe('"none"'); expect(request.headers.get("idempotency-key")).toBe("intent-1"); expect(request.headers.get("authorization")).toBe("Bearer current-token");
    expect([...request.body!.keys()].sort()).toEqual(["altText", "file"]); expect(request.body!.get("altText")).toBe("عکس محصول"); expect(request.body!.get("file")).toBeInstanceOf(File);
    expect(controller.snapshot()).toMatchObject({ phase: "ready", image: image(), fileName: null, etag: '"image-1"' }); expect(deps.changed).toHaveBeenCalledOnce();
    expect(JSON.stringify(controller.uppy.getState().meta)).not.toContain("current-token");
  });
  it("reports actual progress and never announces persistence at 100% before response", async () => {
    const { controller, setCurrent } = setup(); await controller.load(); select(controller);
    TestXHR.reply = xhr => xhr.progress(20, 20);
    const upload = controller.upload(); await vi.waitFor(() => expect(controller.snapshot().progress).toBe(100));
    expect(controller.snapshot().phase).toBe("uploading"); expect(controller.snapshot().image).toBeNull();
    setCurrent(image()); TestXHR.requests[0].respond(200, image()); await upload;
    expect(controller.snapshot().phase).toBe("ready");
  });
  it("replaces using the current generation and gives changed payload a fresh key", async () => {
    const { controller, setCurrent } = setup("product-1", image()); await controller.load(); select(controller);
    TestXHR.reply = xhr => xhr.respond(422, { code: "COMMERCE_IMAGE_INVALID" }); await controller.upload();
    controller.setAltText("متن تازه"); TestXHR.reply = xhr => { setCurrent(image("image-2")); xhr.respond(200, image("image-2")); }; await controller.upload();
    expect(TestXHR.requests.map(xhr => xhr.headers.get("if-match"))).toEqual(['"image-1"', '"image-1"']);
    expect(TestXHR.requests.map(xhr => xhr.headers.get("idempotency-key"))).toEqual(["intent-1", "intent-2"]);
    expect(TestXHR.requests[1].body!.get("altText")).toBe("متن تازه");
  });
  it("reconciles an ambiguous committed upload and retries only the same immutable intent", async () => {
    const { controller, setCurrent, api } = setup(); await controller.load(); select(controller); controller.setAltText("ثابت");
    TestXHR.reply = xhr => { setCurrent(image()); xhr.fail(); }; await controller.upload();
    expect(controller.snapshot()).toMatchObject({ phase: "unresolved", image: image() }); expect(api.metadata).toHaveBeenCalledTimes(2);
    controller.setAltText("نباید عوض شود"); controller.clearSelection(); await controller.upload();
    expect(TestXHR.requests).toHaveLength(1);
    TestXHR.reply = xhr => xhr.respond(200, image()); await controller.retry();
    expect(TestXHR.requests.map(xhr => xhr.headers.get("idempotency-key"))).toEqual(["intent-1", "intent-1"]);
    expect(TestXHR.requests.map(xhr => xhr.headers.get("if-match"))).toEqual(['"none"', '"none"']);
    expect(TestXHR.requests[1].body!.get("altText")).toBe("ثابت"); expect(controller.snapshot().phase).toBe("ready");
  });
  it("does not silently overwrite on conflict; the next deliberate action uses fresh ETag/key", async () => {
    const { controller, setCurrent } = setup(); await controller.load(); select(controller);
    TestXHR.reply = xhr => { setCurrent(image("other-admin")); xhr.respond(412, { code: "COMMERCE_IMAGE_REVISION_CONFLICT" }); }; await controller.upload();
    expect(controller.snapshot()).toMatchObject({ phase: "conflict", etag: '"other-admin"' }); expect(TestXHR.requests).toHaveLength(1);
    TestXHR.reply = xhr => { setCurrent(image("new")); xhr.respond(200, image("new")); }; await controller.upload();
    expect(TestXHR.requests[1].headers.get("if-match")).toBe('"other-admin"'); expect(TestXHR.requests[1].headers.get("idempotency-key")).toBe("intent-2");
  });
  it("keeps pending operations unresolved, and expires them without an automatic new mutation", async () => {
    const { controller } = setup(); await controller.load(); select(controller);
    TestXHR.reply = xhr => xhr.respond(409, { code: "COMMERCE_IMAGE_OPERATION_PENDING" }); await controller.upload();
    expect(controller.snapshot().phase).toBe("unresolved");
    TestXHR.reply = xhr => xhr.respond(409, { code: "COMMERCE_IMAGE_OPERATION_EXPIRED" }); await controller.retry();
    expect(controller.snapshot().phase).toBe("conflict"); expect(TestXHR.requests).toHaveLength(2);
  });
  it("keeps retry possible if reconciliation fails, using the original precondition", async () => {
    const { controller, api } = setup(); await controller.load(); select(controller);
    api.metadata.mockRejectedValueOnce(new Error("offline")); TestXHR.reply = xhr => xhr.fail(); await controller.upload();
    expect(controller.snapshot()).toMatchObject({ phase: "unresolved", etag: null });
    TestXHR.reply = xhr => xhr.respond(409, { code: "COMMERCE_IMAGE_OPERATION_PENDING" }); await controller.retry();
    expect(TestXHR.requests[1].headers.get("if-match")).toBe('"none"');
  });
  it("reconciles an already accepted response without uploading again", async () => {
    const { controller, api, setCurrent } = setup(); await controller.load(); select(controller);
    api.metadata.mockRejectedValueOnce(new Error("offline")); TestXHR.reply = xhr => { setCurrent(image()); xhr.respond(200, image()); }; await controller.upload();
    expect(controller.snapshot().phase).toBe("unresolved"); await controller.load();
    expect(controller.snapshot()).toMatchObject({ phase: "ready", image: image() }); expect(TestXHR.requests).toHaveLength(1);
  });
  it("settles a timed-out response as ambiguous and does not automatically resend", async () => {
    const { controller, api } = setup(); await controller.load(); select(controller);
    TestXHR.reply = xhr => { expect(xhr.timeout).toBe(35_000); xhr.ontimeout?.(new Event("timeout")); };
    await controller.upload();
    expect(controller.snapshot().phase).toBe("unresolved"); expect(api.metadata).toHaveBeenCalledTimes(2); expect(TestXHR.requests).toHaveLength(1);
  });
  it("distinguishes queue removal from persisted deletion and uses stable deletion retry", async () => {
    const { controller, api } = setup("product-1", image()); await controller.load(); select(controller); controller.clearSelection();
    expect(api.remove).not.toHaveBeenCalled(); expect(controller.snapshot().image).toEqual(image());
    api.remove.mockRejectedValueOnce(new ProductImageApiError(0)); await controller.remove(); await controller.retry();
    expect(api.remove.mock.calls.map(([, operation]) => operation)).toEqual([{ etag: '"image-1"', key: "intent-1" }, { etag: '"image-1"', key: "intent-1" }]);
    expect(controller.snapshot().image).toBeNull();
  });
  it("rejects extra files, unsupported types and files exceeding 5MiB", async () => {
    const { controller } = setup(); await controller.load();
    expect(() => controller.uppy.addFile({ name: "bad.svg", type: "image/svg+xml", data: new File(["svg"], "bad.svg", { type: "image/svg+xml" }) })).toThrow();
    expect(() => controller.uppy.addFile({ name: "large.png", type: "image/png", data: new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }) })).toThrow();
    select(controller); expect(() => select(controller, "second.png")).toThrow(); expect(TestXHR.requests).toHaveLength(0);
  });
  it("uses the existing single-flight refresh manager just before XHR sends", async () => {
    let now = 0; let refreshes = 0;
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify({ accessToken: `token-${++refreshes}`, tokenType: "Bearer", expiresIn: 600, user: { id: "admin", phone: "+989100000000", roles: ["ADMIN"] } }), { headers: { "content-type": "application/json" } }));
    const manager = new DashboardSessionManager(createApiClient({ baseUrl: "https://api.test", fetch }), () => now);
    await manager.bootstrap(); now = 601_000;
    const { controller, deps, setCurrent } = setup(); deps.token = async () => { const snapshot = await manager.bootstrap(); return snapshot.status === "authenticated" ? snapshot.authentication.accessToken : null; };
    await controller.load(); select(controller); TestXHR.reply = xhr => { setCurrent(image()); xhr.respond(200, image()); }; await controller.upload();
    expect(TestXHR.requests[0].headers.get("authorization")).toBe("Bearer token-2"); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("revokes local/persisted URLs and ignores a late read after product switching", async () => {
    const first = setup("first", image()); await first.controller.load(); select(first.controller); first.controller.clearSelection();
    expect(first.deps.revokeUrl).toHaveBeenCalledWith("blob:test-2"); first.controller.dispose();
    expect(first.deps.revokeUrl).toHaveBeenCalledWith("blob:test-1");
    const second = setup("second"); let resolveRead!: (value: { image: ProductImage | null; etag: string }) => void;
    second.api.metadata.mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve; }));
    const load = second.controller.load(); second.controller.dispose(); resolveRead({ image: image("late"), etag: '"late"' }); await load;
    expect(second.controller.snapshot().image).toBeNull(); expect(second.api.preview).not.toHaveBeenCalled();
  });
  it("keeps an in-flight auth hook scoped to its original product after navigation", async () => {
    const first = setup("first"); await first.controller.load(); select(first.controller);
    let releaseToken!: (value: string) => void;
    first.deps.token = vi.fn(() => new Promise<string | null>(resolve => { releaseToken = resolve; }));
    const upload = first.controller.upload(); await vi.waitFor(() => expect(first.deps.token).toHaveBeenCalled());
    first.controller.dispose();
    const second = setup("second"); await second.controller.load();
    releaseToken("late-fresh-token"); await upload;
    expect(TestXHR.requests[0].url).toContain("/products/first/image");
    expect(TestXHR.requests[0].headers.get("idempotency-key")).toBe("intent-1");
    expect(TestXHR.requests[0].headers.get("if-match")).toBe('"none"');
    expect(first.api.metadata).toHaveBeenCalledTimes(1); expect(first.deps.changed).not.toHaveBeenCalled();
    expect(second.controller.snapshot()).toMatchObject({ phase: "ready", image: null, etag: '"none"' });
  });
});

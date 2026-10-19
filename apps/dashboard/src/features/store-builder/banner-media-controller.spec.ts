import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BannerMediaController, type BannerMediaDependencies } from "./banner-media-controller";
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

const instances: BannerMediaController[] = [];
function setup() {
  let revision = '"original"'; let count = 0;
  const deps: BannerMediaDependencies = { endpoint: "https://api.test/v1/admin/content/banners/b/image", etag: () => revision, key: () => `operation-${++count}`, token: vi.fn(async () => "fresh-token"), changed: vi.fn(async () => {}), createUrl: vi.fn(() => "blob:local"), revokeUrl: vi.fn() };
  const controller = new BannerMediaController("b", deps); instances.push(controller);
  return { controller, deps, setEtag: (value: string) => { revision = value; } };
}
const select = (c: BannerMediaController) => c.uppy.addFile({ name: "photo.png", type: "image/png", data: new File(["image"], "photo.png", { type: "image/png" }) });
describe("banner uploader with actual Uppy and deterministic XHR", () => {
  beforeEach(() => { TestXHR.requests = []; TestXHR.reply = xhr => xhr.respond(200, {}); vi.stubGlobal("XMLHttpRequest", TestXHR); });
  afterEach(() => { instances.splice(0).forEach(c => c.dispose()); vi.unstubAllGlobals(); });
  it("pins a revision, sends a fresh token and clears the selected file after server confirmation", async () => {
    const { controller, deps } = setup(); select(controller); await controller.upload();
    expect(TestXHR.requests).toHaveLength(1); expect(TestXHR.requests[0]!.headers.get("authorization")).toBe("Bearer fresh-token");
    expect(TestXHR.requests[0]!.headers.get("if-match")).toBe('"original"'); expect(TestXHR.requests[0]!.headers.get("idempotency-key")).toBe("operation-1");
    expect(controller.snapshot()).toMatchObject({ phase: "idle", fileName: null, localPreview: null }); expect(controller.uppy.getFiles()).toHaveLength(0); expect(deps.revokeUrl).toHaveBeenCalledWith("blob:local");
  });
  it("retries confirmation without a second upload when a successful transfer cannot refresh", async () => {
    const { controller, deps } = setup(); vi.mocked(deps.changed).mockRejectedValueOnce(new Error("offline")); select(controller);
    await controller.upload(); expect(controller.snapshot().phase).toBe("error"); expect(controller.snapshot().fileName).toBe("photo.png");
    await controller.upload(); expect(controller.snapshot().phase).toBe("idle"); expect(TestXHR.requests).toHaveLength(1); expect(deps.changed).toHaveBeenCalledTimes(2);
  });
  it("retries an ambiguous transfer with the exact same operation and old revision", async () => {
    TestXHR.reply = xhr => xhr.fail(); const { controller, setEtag } = setup(); select(controller); await controller.upload();
    setEtag('"different"'); TestXHR.reply = xhr => xhr.respond(200, {}); await controller.upload();
    expect(TestXHR.requests).toHaveLength(2); expect(TestXHR.requests[1]!.headers.get("if-match")).toBe('"original"'); expect(TestXHR.requests[1]!.headers.get("idempotency-key")).toBe("operation-1");
  });
  it("starts a new version-pinned intent only after deliberate reselection", async () => {
    TestXHR.reply = xhr => xhr.respond(412, {}); const { controller, setEtag } = setup(); select(controller); await controller.upload();
    controller.clearSelection(); setEtag('"current"'); select(controller); TestXHR.reply = xhr => xhr.respond(200, {}); await controller.upload();
    expect(TestXHR.requests[1]!.headers.get("if-match")).toBe('"current"'); expect(TestXHR.requests[1]!.headers.get("idempotency-key")).toBe("operation-2");
  });
  it("prevents double-click uploads and releases the local image on disposal", async () => {
    TestXHR.reply = () => {}; const { controller, deps } = setup(); select(controller); const pending = controller.upload();
    await vi.waitFor(() => expect(TestXHR.requests).toHaveLength(1)); await controller.upload(); expect(TestXHR.requests).toHaveLength(1);
    controller.dispose(); TestXHR.requests[0]!.respond(200, {}); await pending;
    expect(deps.revokeUrl).toHaveBeenCalledWith("blob:local"); expect(deps.changed).not.toHaveBeenCalled();
  });
});

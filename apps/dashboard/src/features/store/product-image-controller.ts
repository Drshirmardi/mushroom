import Uppy, { type Meta, type UppyFile } from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import fa_IR from "@uppy/locales/lib/fa_IR";
import { imageErrorMessage, ProductImageApiError, type ImageOperation, type ImageRevision, type ProductImage, type createProductImageApi } from "../../lib/commerce-product-image-api";

type Body = Record<string, never>;
type SelectedFile = UppyFile<Meta, Body>;
type Phase = "loading" | "ready" | "uploading" | "confirming" | "unresolved" | "conflict" | "error";
export type ImageEditorState = {
  phase: Phase; image: ProductImage | null; etag: string | null; savedPreview: string | null;
  localPreview: string | null; fileName: string | null; altText: string; progress: number; message: string;
};
type Intent = ImageOperation & { kind: "upload" | "remove"; file?: SelectedFile; altText?: string; accepted?: boolean };
export type ImageEditorDependencies = {
  api: ReturnType<typeof createProductImageApi>; token: () => Promise<string | null>; endpoint: string;
  changed: () => Promise<void>; createUrl: (blob: Blob) => string; revokeUrl: (url: string) => void; key: () => string;
};

// Coordinates UI intents; Uppy owns file selection, multipart transport and network progress.
export class ProductImageController {
  readonly uppy: Uppy<Meta, Body>;
  private state: ImageEditorState = { phase: "loading", image: null, etag: null, savedPreview: null, localPreview: null, fileName: null, altText: "", progress: 0, message: "" };
  private listeners = new Set<() => void>();
  private disposed = false;
  private mutationInFlight = false;
  private intent: Intent | null = null;
  private read: AbortController | null = null;
  private readGeneration = 0;
  private xhrStatus = 0;
  private xhrCode = "";
  readonly snapshot = () => this.state;
  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  constructor(readonly productId: string, private readonly deps: ImageEditorDependencies) {
    this.uppy = new Uppy<Meta, Body>({ id: `product-media-${productId}`, autoProceed: false, locale: fa_IR, restrictions: { maxNumberOfFiles: 1, maxFileSize: 5 * 1024 * 1024, allowedFileTypes: ["image/jpeg", "image/png", "image/webp"] }, onBeforeFileAdded: file => !this.locked() && file.data instanceof Blob });
    this.uppy.use(XHRUpload, {
      endpoint: deps.endpoint, method: "PUT", formData: true, fieldName: "file", allowedMetaFields: ["altText"], bundle: false, limit: 1, timeout: 30_000,
      shouldRetry: () => false,
      onBeforeRequest: async (xhr) => {
        // Uppy reports stalled progress; the native XHR deadline also covers a lost response.
        xhr.timeout = 35_000;
        xhr.ontimeout = event => { this.xhrStatus = 0; this.xhrCode = ""; xhr.onerror?.call(xhr, event); };
        // Session bootstrap uses the existing single-flight refresh manager, never Uppy metadata.
        const token = await deps.token().catch(() => null);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        if (this.intent) { xhr.setRequestHeader("If-Match", this.intent.etag); xhr.setRequestHeader("idempotency-key", this.intent.key); }
      },
      onAfterResponse: (xhr) => {
        this.xhrStatus = xhr.status;
        try { this.xhrCode = (JSON.parse(xhr.responseText) as { code?: string }).code ?? ""; } catch { this.xhrCode = ""; }
      },
    });
    this.uppy.on("file-added", file => {
      if (!(file.data instanceof Blob)) return;
      this.intent = null;
      this.setUrl("localPreview", this.deps.createUrl(file.data));
      this.update({ fileName: file.name ?? "تصویر", altText: "", progress: 0, message: "" });
      this.uppy.setFileMeta(file.id, { altText: "" });
    });
    this.uppy.on("file-removed", () => { this.setUrl("localPreview", null); this.update({ fileName: null, altText: "", progress: 0 }); });
    this.uppy.on("restriction-failed", () => this.update({ message: "یک تصویر JPEG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید." }));
    this.uppy.on("upload-progress", (_file, progress) => this.update({ progress: progress.bytesTotal ? Math.min(100, Math.round(100 * progress.bytesUploaded / progress.bytesTotal)) : 0 }));
  }
  private update(next: Partial<ImageEditorState>) { if (this.disposed) return; this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener()); }
  private locked() { return ["loading", "uploading", "confirming", "unresolved"].includes(this.state.phase); }
  private setUrl(field: "localPreview" | "savedPreview", url: string | null) {
    if (this.state[field]) this.deps.revokeUrl(this.state[field]);
    if (this.disposed) { if (url) this.deps.revokeUrl(url); return; }
    this.update({ [field]: url });
  }
  setAltText(altText: string) {
    if (this.locked()) return;
    const file = this.uppy.getFiles()[0];
    if (file) this.uppy.setFileMeta(file.id, { altText: altText.slice(0, 240) });
    this.intent = null;
    this.update({ altText: altText.slice(0, 240) });
  }
  private clearLocal() { this.uppy.clear(); this.setUrl("localPreview", null); this.update({ fileName: null, altText: "", progress: 0 }); }
  clearSelection() { if (!this.locked()) { this.intent = null; this.clearLocal(); } }

  private async readCurrent(): Promise<ImageRevision> {
    this.read?.abort(); const read = new AbortController(); this.read = read;
    const generation = ++this.readGeneration;
    const revision = await this.deps.api.metadata(this.productId, read.signal);
    if (this.disposed || generation !== this.readGeneration) throw new Error("Stale image read");
    this.update({ image: revision.image, etag: revision.etag });
    this.setUrl("savedPreview", null);
    if (revision.image) {
      try {
        const blob = await this.deps.api.preview(this.productId, read.signal);
        if (!this.disposed && generation === this.readGeneration) this.setUrl("savedPreview", this.deps.createUrl(blob));
      } catch { if (!this.disposed && generation === this.readGeneration) this.update({ message: "پیش‌نمایش ذخیره‌شده دریافت نشد؛ می‌توانید وضعیت را دوباره دریافت کنید." }); }
    }
    return revision;
  }
  async load() {
    if (this.disposed || ["uploading", "confirming"].includes(this.state.phase)) return;
    const unresolved = this.intent !== null && this.state.phase === "unresolved";
    this.update({ phase: "loading", message: "" });
    try {
      await this.readCurrent();
      if (unresolved && this.intent?.accepted) { this.intent = null; this.clearLocal(); this.update({ phase: "ready", message: "پذیرش درخواست و وضعیت فعلی از سرور تأیید شد." }); await this.notifyChanged(); }
      else this.update({ phase: unresolved ? "unresolved" : "ready", ...(unresolved ? { message: "نتیجهٔ عملیات قبلی قطعی نیست؛ فقط همان عملیات را تکرار کنید." } : {}) });
    }
    catch (error) { this.update({ phase: unresolved ? "unresolved" : "error", message: imageErrorMessage(error instanceof ProductImageApiError ? error.status : 0) }); }
  }
  async upload(retry = false) {
    if (this.disposed || ["loading", "uploading", "confirming"].includes(this.state.phase)) return;
    const file = this.uppy.getFiles()[0];
    if (!file || (!retry && !this.state.etag) || (this.state.phase === "unresolved" && !retry)) return;
    if (retry) { if (this.intent?.kind !== "upload" || this.intent.file?.id !== file.id) return; }
    else this.intent = { kind: "upload", file, altText: this.state.altText, etag: this.state.etag!, key: this.deps.key() };
    this.xhrStatus = 0; this.xhrCode = "";
    this.mutationInFlight = true;
    this.update({ phase: "uploading", progress: 0, message: "" });
    try {
      const result = retry || file.error ? await this.uppy.retryUpload(file.id) : await this.uppy.upload();
      if (this.disposed) return;
      if (!result || result.failed?.length || !result.successful?.length) { await this.failed(this.xhrStatus, this.xhrCode); return; }
      await this.confirmed("تصویر از سرور تأیید و ذخیره شد.");
    } catch { if (!this.disposed) await this.failed(this.xhrStatus, this.xhrCode); }
    finally { this.mutationInFlight = false; if (this.disposed) this.release(); }
  }
  async remove(retry = false) {
    if (this.disposed || ["loading", "uploading", "confirming"].includes(this.state.phase) || (!retry && (!this.state.etag || this.state.phase === "unresolved" || !this.state.image))) return;
    if (retry) { if (this.intent?.kind !== "remove") return; }
    else this.intent = { kind: "remove", etag: this.state.etag!, key: this.deps.key() };
    this.mutationInFlight = true;
    this.update({ phase: "uploading", message: "" });
    try { await this.deps.api.remove(this.productId, { etag: this.intent.etag, key: this.intent.key }); if (!this.disposed) await this.confirmed("حذف تصویر از سرور تأیید شد."); }
    catch (error) { if (!this.disposed) await this.failed(error instanceof ProductImageApiError ? error.status : 0, error instanceof ProductImageApiError ? error.code : ""); }
    finally { this.mutationInFlight = false; if (this.disposed) this.release(); }
  }
  async retry() { if (this.state.phase === "unresolved") { if (this.intent?.kind === "upload") await this.upload(true); else await this.remove(true); } }
  private async confirmed(message: string) {
    if (this.intent) this.intent.accepted = true;
    this.update({ phase: "confirming" });
    // A 100% network transfer is not server-confirmed editor state. Always reload, including replay.
    try {
      await this.readCurrent();
      if (this.disposed) return;
      this.intent = null; this.clearLocal();
      this.update({ phase: "ready", message });
      await this.notifyChanged();
    } catch { this.update({ phase: "unresolved", message: "درخواست پذیرفته شد، اما دریافت وضعیت نهایی ناموفق بود؛ ابتدا وضعیت را بررسی کنید." }); }
  }
  private async notifyChanged() { try { await this.deps.changed(); } catch { this.update({ message: "تصویر تأیید شد، اما فهرست محصولات به‌روز نشد؛ فهرست را دوباره دریافت کنید." }); } }
  private async failed(status: number, code: string) {
    const pending = code === "COMMERCE_IMAGE_OPERATION_PENDING";
    const conflict = (status === 409 && !pending) || status === 412;
    const unknown = pending || status === 0 || status >= 500;
    this.update({ phase: "confirming" });
    try { await this.readCurrent(); }
    catch { this.update({ etag: null }); }
    if (!unknown) this.intent = null;
    this.update({ phase: unknown ? "unresolved" : conflict ? "conflict" : "error", message: imageErrorMessage(status, code) });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.readGeneration++; this.read?.abort();
    for (const url of [this.state.savedPreview, this.state.localPreview]) if (url) this.deps.revokeUrl(url);
    this.listeners.clear();
    // Uppy awaits the async authentication hook before send. Destroying it mid-hook
    // can send on an already aborted XHR. Let the bounded, authorized intent settle;
    // disposed editors cannot update UI/caches or borrow another product's headers.
    if (!this.mutationInFlight) this.release();
  }
  private release() { this.uppy.destroy(); this.intent = null; }
}

import Uppy, { type Meta } from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import fa_IR from "@uppy/locales/lib/fa_IR";
import { bannerErrorMessage } from "../../lib/content-banners-api";

type Body = Record<string, never>;
type Phase = "idle" | "uploading" | "confirming" | "error";
export type BannerMediaState = { phase: Phase; fileName: string | null; localPreview: string | null; progress: number; message: string };
export type BannerMediaDependencies = {
  endpoint: string;
  etag: () => string;
  key: () => string;
  token: () => Promise<string | null>;
  changed: () => Promise<void>;
  createUrl: (blob: Blob) => string;
  revokeUrl: (url: string) => void;
};

/** Version-pinned, idempotent upload; transfer progress never replaces server confirmation. */
export class BannerMediaController {
  readonly uppy: Uppy<Meta, Body>;
  private state: BannerMediaState = { phase: "idle", fileName: null, localPreview: null, progress: 0, message: "" };
  private listeners = new Set<() => void>();
  private disposed = false;
  private mutationInFlight = false;
  private intent: { etag: string; key: string; accepted: boolean } | null = null;
  private xhrStatus = 0;
  private xhrCode = "";
  readonly snapshot = () => this.state;
  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  constructor(readonly bannerId: string, private readonly deps: BannerMediaDependencies) {
    this.uppy = new Uppy<Meta, Body>({ id: `banner-media-${bannerId}`, autoProceed: false, locale: fa_IR, restrictions: { maxNumberOfFiles: 1, maxFileSize: 5 * 1024 * 1024, allowedFileTypes: ["image/jpeg", "image/png", "image/webp"] }, onBeforeFileAdded: file => !this.locked() && file.data instanceof Blob });
    this.uppy.use(XHRUpload, {
      endpoint: deps.endpoint, method: "PUT", formData: true, fieldName: "file", allowedMetaFields: [], bundle: false, limit: 1, timeout: 30_000,
      shouldRetry: () => false,
      onBeforeRequest: async (xhr) => {
        xhr.timeout = 35_000;
        xhr.ontimeout = event => { this.xhrStatus = 0; this.xhrCode = ""; xhr.onerror?.call(xhr, event); };
        if (this.intent) { xhr.setRequestHeader("If-Match", this.intent.etag); xhr.setRequestHeader("Idempotency-Key", this.intent.key); }
        const token = await deps.token().catch(() => null);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      },
      onAfterResponse: (xhr) => { this.xhrStatus = xhr.status; try { this.xhrCode = (JSON.parse(xhr.responseText) as { code?: string }).code ?? ""; } catch { this.xhrCode = ""; } },
    });
    this.uppy.on("file-added", (file) => {
      if (!(file.data instanceof Blob)) return;
      this.intent = null;
      this.setUrl("localPreview", this.deps.createUrl(file.data));
      this.update({ fileName: file.name ?? "تصویر", progress: 0, message: "" });
    });
    this.uppy.on("file-removed", () => { this.intent = null; this.setUrl("localPreview", null); this.update({ fileName: null, progress: 0 }); });
    this.uppy.on("restriction-failed", () => this.update({ message: "یک تصویر JPEG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید." }));
    this.uppy.on("upload-progress", (_file, progress) => this.update({ progress: progress.bytesTotal ? Math.min(100, Math.round(100 * progress.bytesUploaded / progress.bytesTotal)) : 0 }));
  }
  private update(next: Partial<BannerMediaState>) { if (this.disposed) return; this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener()); }
  private locked() { return this.state.phase === "uploading" || this.state.phase === "confirming"; }
  private setUrl(field: "localPreview", url: string | null) { if (this.state[field]) this.deps.revokeUrl(this.state[field]); if (this.disposed) { if (url) this.deps.revokeUrl(url); return; } this.update({ [field]: url }); }
  clearSelection() { if (this.locked()) return; this.uppy.clear(); this.setUrl("localPreview", null); this.update({ fileName: null, progress: 0, message: "" }); }
  async upload() {
    if (this.disposed || this.locked()) return;
    const file = this.uppy.getFiles()[0];
    if (!file) return;
    this.intent ??= { etag: this.deps.etag(), key: this.deps.key(), accepted: false };
    this.xhrStatus = 0; this.xhrCode = "";
    this.mutationInFlight = true;
    this.update({ phase: "uploading", progress: 0, message: "" });
    try {
      const result = this.intent.accepted ? null : file.error ? await this.uppy.retryUpload(file.id) : await this.uppy.upload();
      if (this.disposed) return;
      if (!this.intent.accepted && (!result || result.failed?.length || !result.successful?.length)) { this.update({ phase: "error", message: bannerErrorMessage(this.xhrStatus, this.xhrCode) }); return; }
      this.intent.accepted = true;
      this.update({ phase: "confirming", message: "" });
      await this.deps.changed();
      if (!this.disposed) { this.update({ phase: "idle" }); this.clearSelection(); this.update({ message: "تصویر بنر ذخیره شد." }); }
    } catch {
      if (!this.disposed) this.update({ phase: "error", message: this.intent?.accepted ? "تصویر ارسال شد، اما وضعیت تازه دریافت نشد؛ دوباره برای تأیید وضعیت تلاش کنید." : bannerErrorMessage(this.xhrStatus, this.xhrCode) });
    } finally { this.mutationInFlight = false; if (this.disposed) this.uppy.destroy(); }
  }
  dispose() { if (this.disposed) return; this.disposed = true; for (const url of [this.state.localPreview]) if (url) this.deps.revokeUrl(url); this.listeners.clear(); if (!this.mutationInFlight) this.uppy.destroy(); }
}

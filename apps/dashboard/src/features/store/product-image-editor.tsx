"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { UppyContextProvider, useDropzone } from "@uppy/react";
import { ImagePlus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { getDashboardAccessToken } from "../../components/auth/dashboard-session-gate";
import { apiBaseUrl } from "../../lib/api";
import { productImageApi } from "../../lib/commerce-product-image-api";
import type { CommerceProduct } from "../../lib/commerce-catalog-api";
import { ProductImageController } from "./product-image-controller";
import type { ProductEditorState } from "./catalog-view";

const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

function SelectionZone({ disabled }: { disabled: boolean }) {
  // Uppy headless owns drag/drop, the native picker and keyboard handlers. Its generated
  // Dropzone currently hardcodes an English label; the hook allows the existing Persian UI.
  const { getRootProps, getInputProps } = useDropzone();
  return <fieldset disabled={disabled} className="min-w-0 border-0 p-0 disabled:opacity-50">
    <input {...getInputProps()} className="hidden" aria-label="انتخاب تصویر محصول" />
    <div {...getRootProps()} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label="انتخاب تصویر یا کشیدن و رها کردن فایل" className={`rounded-xl border-2 border-dashed border-border bg-secondary/30 p-5 text-center outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 ${disabled ? "pointer-events-none" : "cursor-pointer hover:border-primary/50"}`}>
      <ImagePlus className="mx-auto mb-2 text-primary" size={26} aria-hidden />
      <p className="text-sm font-semibold">تصویر را اینجا رها کنید یا برای انتخاب کلیک کنید</p>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">یک فایل JPEG، PNG یا WebP، حداکثر ۵ مگابایت؛ تصویر غیرمتحرک</p>
    </div>
  </fieldset>;
}

function EditorBody({ controller, product, onClose, embedded, onEditorStateChange }: { controller: ProductImageController; product: CommerceProduct; onClose: () => void; embedded: boolean; onEditorStateChange?: (state: ProductEditorState) => void }) {
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  const busy = state.phase === "uploading" || state.phase === "confirming";
  const locked = busy || state.phase === "loading" || state.phase === "unresolved";
  useEffect(() => { onEditorStateChange?.({ busy, dirty: state.fileName !== null, blocked: state.phase === "unresolved" }); }, [busy, state.fileName, state.phase, onEditorStateChange]);
  return <>
    <header className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
      <div className="min-w-0"><h2 id="product-image-editor-title" className="font-bold">تصویر محصول</h2><p className="mt-1 break-words text-sm text-muted-foreground">{product.title}</p></div>
      {!embedded && <button type="button" disabled={busy} onClick={onClose} className={secondary} aria-label="بستن ویرایشگر تصویر"><X size={18} /></button>}
    </header>
    <div className="space-y-5 p-4 sm:p-5">
      <section aria-label="تصویر ذخیره‌شده" className="rounded-xl border border-border p-3">
        <h3 className="mb-3 text-sm font-bold">تصویر ذخیره‌شده</h3>
        {state.phase === "loading" ? <p role="status" className="text-sm text-muted-foreground">در حال دریافت تصویر…</p> : state.image ? <>
          {state.savedPreview ? <Image src={state.savedPreview} width={320} height={220} unoptimized alt={state.image.altText || `تصویر ذخیره‌شدهٔ ${product.title}`} className="mx-auto h-40 w-full rounded-lg bg-secondary/30 object-contain" /> : <p className="text-sm text-muted-foreground">تصویر ثبت شده، اما پیش‌نمایش دریافت نشده است.</p>}
          <p className="mt-2 break-words text-xs text-muted-foreground">{state.image.altText || "بدون متن جایگزین"}</p>
          <button type="button" disabled={locked || !state.etag} onClick={() => void controller.remove()} className={`${secondary} mt-3 border-red-200 text-red-700`}><Trash2 size={16} />حذف تصویر ذخیره‌شده</button>
        </> : <p className="text-sm text-muted-foreground">{state.etag ? "این محصول تصویر ذخیره‌شده ندارد." : "وضعیت تصویر دریافت نشده است."}</p>}
      </section>
      <UppyContextProvider uppy={controller.uppy}><SelectionZone disabled={locked || !state.etag} /></UppyContextProvider>
      {state.fileName && <section aria-label="تصویر انتخاب‌شده" className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">پیش‌نمایش محلی؛ هنوز ذخیره نشده</h3><button type="button" disabled={locked} onClick={() => controller.clearSelection()} className={secondary} aria-label="حذف فایل از انتخاب"><X size={16} /></button></div>
        {state.localPreview && <Image src={state.localPreview} width={320} height={220} unoptimized alt="پیش‌نمایش تصویر انتخاب‌شده" className="mx-auto h-40 w-full rounded-lg object-contain" />}
        <p className="break-all text-xs text-muted-foreground"><bdi dir="ltr">{state.fileName}</bdi></p>
        <label className="block text-sm" htmlFor="product-image-alt">متن جایگزین (اختیاری)</label>
        <input id="product-image-alt" maxLength={240} disabled={locked} value={state.altText} onChange={event => controller.setAltText(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50" aria-describedby="product-image-alt-help" />
        <p id="product-image-alt-help" className="text-xs text-muted-foreground">توضیح کوتاه تصویر برای دسترس‌پذیری؛ حداکثر ۲۴۰ نویسه</p>
        <button type="button" disabled={locked || !state.etag} onClick={() => void controller.upload()} className={primary}><Upload size={16} />{state.phase === "conflict" ? "ارسال با نسخهٔ تازه" : state.image ? "جایگزینی تصویر" : "آپلود تصویر"}</button>
      </section>}
      {busy && <div className="space-y-2" aria-live="polite">
        <div role="progressbar" aria-label="پیشرفت ارسال تصویر" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${state.progress}%` }} /></div>
        <p className="text-sm text-muted-foreground">{state.phase === "confirming" || state.progress === 100 ? "در انتظار تأیید وضعیت ذخیره‌شده از سرور…" : `در حال ارسال: ${state.progress.toLocaleString("fa-IR")}٪`}</p>
      </div>}
      {state.message && <p role={state.phase === "ready" ? "status" : "alert"} className={`rounded-xl p-3 text-sm leading-6 ${state.phase === "ready" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-950"}`}>{state.message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || state.phase === "loading"} onClick={() => void controller.load()} className={secondary}><RefreshCw size={16} />دریافت وضعیت تازه</button>
        {state.phase === "unresolved" && <button type="button" onClick={() => void controller.retry()} className={primary}>تکرار همان عملیات</button>}
      </div>
    </div>
  </>;
}

export default function ProductImageEditor({ product, onClose, onChanged, embedded = false, onEditorStateChange }: { product: CommerceProduct; onClose: () => void; onChanged: () => Promise<void>; embedded?: boolean; onEditorStateChange?: (state: ProductEditorState) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef<ProductImageController | null>(null);
  const changed = useRef(onChanged);
  const [controller, setController] = useState<ProductImageController | null>(null);
  useEffect(() => { changed.current = onChanged; }, [onChanged]);
  useEffect(() => {
    const editor = new ProductImageController(product.id, {
      api: productImageApi(getDashboardAccessToken), token: getDashboardAccessToken,
      endpoint: new URL(`/v1/admin/commerce/products/${encodeURIComponent(product.id)}/image`, apiBaseUrl).toString(),
      changed: () => changed.current(), createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url), key: () => crypto.randomUUID(),
    });
    active.current = editor;
    let mounted = true;
    queueMicrotask(() => { if (mounted) { setController(editor); void editor.load(); } });
    return () => { mounted = false; editor.dispose(); active.current = null; };
  }, [product.id]);
  useEffect(() => { const element = dialog.current; if (!embedded) element?.showModal(); return () => element?.close(); }, [embedded]);
  const body = controller ? <EditorBody controller={controller} product={product} onClose={onClose} embedded={embedded} onEditorStateChange={onEditorStateChange} /> : <div className="p-5"><h2 id="product-image-editor-title">تصویر محصول</h2><p role="status">در حال آماده‌سازی…</p></div>;
  if (embedded) return <section aria-label="تصویر محصول">{body}</section>;
  return <dialog ref={dialog} dir="rtl" aria-labelledby="product-image-editor-title" onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]') ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0]; const last = controls.at(-1);
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }} onCancel={event => {
    if (["uploading", "confirming"].includes(active.current?.snapshot().phase ?? "")) event.preventDefault(); else onClose();
  }} className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40">
    {body}
  </dialog>;
}

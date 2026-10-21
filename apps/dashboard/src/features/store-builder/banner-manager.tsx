"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { UppyContextProvider, useDropzone } from "@uppy/react";
import { Archive, Check, Globe, ImagePlus, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";

import { getDashboardAccessToken, useDashboardSession } from "../../components/auth/dashboard-session-gate";
import {
  bannerErrorMessage,
  bannerUploadEndpoint,
  ContentBannerApiError,
  createBanner,
  removeBannerMedia,
  updateBanner,
  type AdminBanner,
} from "../../lib/content-banners-api";
import { BannerMediaController } from "./banner-media-controller";
import { BannerImage } from "./media";

const field = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton = `${secondaryButton} border-red-200 text-red-700`;

const STATUS_LABEL: Record<AdminBanner["publicationStatus"], string> = { DRAFT: "پیش‌نویس", PUBLISHED: "منتشرشده", ARCHIVED: "آرشیو" };
const STATUS_TONE: Record<AdminBanner["publicationStatus"], string> = { DRAFT: "bg-amber-50 text-amber-800", PUBLISHED: "bg-emerald-50 text-emerald-800", ARCHIVED: "bg-slate-100 text-slate-500" };

function useAction(onRefresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true); setMessage(null);
    try { await work(); await onRefresh(); setMessage({ tone: "ok", text: success }); }
    catch (error) { setMessage({ tone: "error", text: bannerErrorMessage(error instanceof ContentBannerApiError ? error.status : 0, error instanceof ContentBannerApiError ? error.code : null) }); }
    finally { setBusy(false); }
  };
  return { busy, message, run };
}

function Dropzone({ disabled }: { disabled: boolean }) {
  const { getRootProps, getInputProps } = useDropzone();
  return <fieldset disabled={disabled} className="min-w-0 border-0 p-0 disabled:opacity-50">
    <input {...getInputProps()} className="hidden" aria-label="انتخاب تصویر بنر" />
    <div {...getRootProps()} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label="انتخاب تصویر یا کشیدن و رها کردن فایل" className={`rounded-xl border-2 border-dashed border-border bg-secondary/20 p-4 text-center outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 ${disabled ? "pointer-events-none" : "cursor-pointer hover:border-primary/50"}`}>
      <ImagePlus className="mx-auto mb-2 text-primary" size={22} aria-hidden />
      <p className="text-sm font-semibold">تصویر را اینجا رها کنید یا برای انتخاب کلیک کنید</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">JPEG، PNG یا WebP — حداکثر ۵ مگابایت</p>
    </div>
  </fieldset>;
}

function BannerUploader({ bannerId, etag, onChanged, onDone, onBusyChange }: { bannerId: string; etag: string; onChanged: () => Promise<void>; onDone: () => void; onBusyChange: (busy: boolean) => void }) {
  const [controller, setController] = useState<BannerMediaController | null>(null);
  const latest = useRef({ etag, onChanged });
  useEffect(() => { latest.current = { etag, onChanged }; }, [etag, onChanged]);
  useEffect(() => {
    const c = new BannerMediaController(bannerId, { endpoint: bannerUploadEndpoint(bannerId), token: getDashboardAccessToken, etag: () => latest.current.etag, key: () => crypto.randomUUID(), changed: () => latest.current.onChanged(), createUrl: b => URL.createObjectURL(b), revokeUrl: u => URL.revokeObjectURL(u) });
    setController(c);
    return () => c.dispose();
  }, [bannerId]);
  if (!controller) return <p role="status" className="text-xs text-muted-foreground">در حال آماده‌سازی…</p>;
  return <BannerUploaderBody controller={controller} onDone={onDone} onBusyChange={onBusyChange} />;
}

function BannerUploaderBody({ controller, onDone, onBusyChange }: { controller: BannerMediaController; onDone: () => void; onBusyChange: (busy: boolean) => void }) {
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  const busy = state.phase === "uploading" || state.phase === "confirming";
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  useEffect(() => { if (state.phase === "idle" && state.message) onDone(); }, [state.phase, state.message, onDone]);
  return <div className="space-y-2">
    <UppyContextProvider uppy={controller.uppy}><Dropzone disabled={busy} /></UppyContextProvider>
    {state.fileName && <div className="space-y-2">
      {state.localPreview && <Image src={state.localPreview} width={480} height={240} unoptimized alt="پیش‌نمایش تصویر انتخاب‌شده" className="h-24 w-full rounded-lg bg-secondary/30 object-contain" />}
      <p className="break-all text-xs text-muted-foreground"><bdi dir="ltr">{state.fileName}</bdi></p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void controller.upload()} className={secondaryButton}><Upload size={15} />آپلود تصویر</button>
        <button type="button" disabled={busy} onClick={() => controller.clearSelection()} className={secondaryButton}><X size={15} />انصراف</button>
      </div>
    </div>}
    {busy && <div className="space-y-1" aria-live="polite">
      <div role="progressbar" aria-label="پیشرفت ارسال تصویر" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.progress} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${state.progress}%` }} /></div>
      <p className="text-xs text-muted-foreground">{state.phase === "confirming" || state.progress === 100 ? "در انتظار تأیید وضعیت ذخیره‌شده…" : `در حال ارسال: ${state.progress.toLocaleString("fa-IR")}٪`}</p>
    </div>}
    {state.message && <p role="status" className="text-xs text-muted-foreground">{state.message}</p>}
  </div>;
}

export function BannerEditor({ banner, accessToken, onRefresh }: { banner: AdminBanner; accessToken: string; onRefresh: () => Promise<void> }) {
  const initial = (value: AdminBanner) => ({ title: value.title, destination: value.destinationUrl ?? "", baseTitle: value.title, baseDestination: value.destinationUrl ?? "", etag: value.etag });
  const [form, setForm] = useState(() => initial(banner));
  const [lastServerEtag, setLastServerEtag] = useState(banner.etag);
  const title = form.title, destination = form.destination;
  const setTitle = (value: string) => setForm(current => ({ ...current, title: value }));
  const setDestination = (value: string) => setForm(current => ({ ...current, destination: value }));
  const [uploadOpen, setUploadOpen] = useState(!banner.contentPath);
  const [uploadBusy, setUploadBusy] = useState(false);
  const { busy: actionBusy, message, run } = useAction(onRefresh);
  const busy = actionBusy || uploadBusy;
  const dirty = title.trim() !== form.baseTitle || destination.trim() !== form.baseDestination;
  const changedOnServer = form.etag !== banner.etag;
  if (lastServerEtag !== banner.etag) {
    setLastServerEtag(banner.etag);
    if (!dirty) setForm(initial(banner));
  }
  const save = () => {
    if (!title.trim() || !dirty || changedOnServer) return;
    void run(async () => { const saved = await updateBanner(accessToken, banner.id, { title: title.trim(), destinationUrl: destination.trim() || null }, form.etag); setForm(initial(saved)); }, "تغییرات ذخیره شد.");
  };
  const setStatus = (status: AdminBanner["publicationStatus"], note: string) => void run(() => updateBanner(accessToken, banner.id, { publicationStatus: status }, banner.etag), note);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h3 className="font-bold">ویرایش بنر</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_TONE[banner.publicationStatus]}`}>{STATUS_LABEL[banner.publicationStatus]}</span>
      </div>
      {dirty && <span className="text-xs font-semibold text-amber-700">تغییرات ذخیره‌نشده</span>}
    </div>

    {changedOnServer && dirty && <p role="alert" className="text-sm text-amber-800">نسخهٔ سرور تغییر کرده است؛ متن شما حفظ شده است. پیش از ذخیره نسخهٔ تازه را بررسی یا بازگردانی کنید.</p>}
    <BannerImage bannerId={banner.id} hasMedia={Boolean(banner.contentPath)} alt={banner.title} refreshKey={banner.updatedAt} className="aspect-[2/1] w-full rounded-xl border border-border" />
    {!banner.contentPath && <p className="text-xs text-muted-foreground">بنر بدون تصویر در فروشگاه دیده نمی‌شود. ابتدا تصویر اضافه کنید.</p>}

    <div className="space-y-3">
      <label className="block space-y-1.5 text-sm font-semibold">عنوان<input disabled={busy} maxLength={240} className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً پیشنهاد ویژهٔ بهار" /></label>
      <label className="block space-y-1.5 text-sm font-semibold">لینک مقصد <span className="font-normal text-muted-foreground">(اختیاری)</span><input disabled={busy} maxLength={2048} className={field} dir="ltr" placeholder="/store یا https://…" value={destination} onChange={e => setDestination(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">هنگام کلیک مشتری روی بنر باز می‌شود؛ مسیر داخلی مثل <bdi dir="ltr">/store</bdi> یا آدرس کامل.</p>
    </div>

    <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold">تصویر بنر</h4>
        <div className="flex gap-2">
          <button type="button" disabled={busy || dirty} onClick={() => setUploadOpen(v => !v)} className={secondaryButton} aria-expanded={uploadOpen}><ImagePlus size={15} />{banner.mediaObjectKey ? "جایگزینی تصویر" : "افزودن تصویر"}</button>
          {banner.mediaObjectKey && <button type="button" disabled={busy || dirty} onClick={() => void run(() => removeBannerMedia(accessToken, banner.id, { etag: banner.etag, key: crypto.randomUUID() }), "تصویر حذف شد.")} className={dangerButton}><Trash2 size={15} />حذف</button>}
        </div>
      </div>
      {uploadOpen && <fieldset disabled={dirty} className="min-w-0 border-0 p-0 disabled:opacity-50"><BannerUploader bannerId={banner.id} etag={banner.etag} onChanged={onRefresh} onDone={() => setUploadOpen(false)} onBusyChange={setUploadBusy} /></fieldset>}
    </div>

    {message && <p role={message.tone === "ok" ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message.text}</p>}

    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <button type="button" disabled={busy || !dirty || changedOnServer || !title.trim()} onClick={save} className={primaryButton}><Check size={16} />ذخیره تغییرات</button>
      {dirty && <button type="button" disabled={busy} onClick={() => setForm(initial(banner))} className={secondaryButton}>بازگردانی</button>}
      {banner.publicationStatus === "PUBLISHED"
        ? <button type="button" disabled={busy || dirty} onClick={() => setStatus("DRAFT", "انتشار لغو شد.")} className={secondaryButton}>لغو انتشار</button>
        : <button type="button" disabled={busy || dirty || !banner.contentPath} onClick={() => setStatus("PUBLISHED", "بنر منتشر شد.")} className={secondaryButton} title={!banner.mediaObjectKey ? "ابتدا تصویر اضافه کنید" : undefined}>انتشار</button>}
      {banner.publicationStatus !== "ARCHIVED" && <button type="button" disabled={busy || dirty} onClick={() => setStatus("ARCHIVED", "بنر آرشیو شد.")} className={`${dangerButton} ml-auto`}><Archive size={15} />آرشیو</button>}
    </div>
  </div>;
}

function CreateBanner({ accessToken, onCreated }: { accessToken: string; onCreated: (banner: AdminBanner) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError(null);
    void createBanner(accessToken, { title: title.trim(), ...(destination.trim() ? { destinationUrl: destination.trim() } : {}) })
      .then(banner => { setTitle(""); setDestination(""); setOpen(false); onCreated(banner); })
      .catch(e => setError(bannerErrorMessage(e instanceof ContentBannerApiError ? e.status : 0)))
      .finally(() => setBusy(false));
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${primaryButton} w-full`}><Plus size={16} />بنر جدید</button>;
  return <form className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3" onSubmit={e => { e.preventDefault(); create(); }}>
    <label className="block space-y-1.5 text-sm font-semibold">عنوان<input autoFocus className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً پیشنهاد ویژهٔ بهار" /></label>
    <label className="block space-y-1.5 text-sm font-semibold">لینک مقصد <span className="font-normal text-muted-foreground">(اختیاری)</span><input className={field} dir="ltr" placeholder="/store" value={destination} onChange={e => setDestination(e.target.value)} /></label>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex gap-2">
      <button type="submit" disabled={busy || !title.trim()} className={`${primaryButton} flex-1`}>{busy ? "در حال ساخت…" : "ساخت و ویرایش"}</button>
      <button type="button" disabled={busy} onClick={() => { setOpen(false); setError(null); }} className={secondaryButton}><X size={15} />انصراف</button>
    </div>
  </form>;
}

function BannerListItem({ banner, selected, onSelect }: { banner: AdminBanner; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-right transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40"}`}>
    <BannerImage bannerId={banner.id} hasMedia={Boolean(banner.contentPath)} alt={banner.title} refreshKey={banner.updatedAt} className="aspect-[2/1] w-20 flex-shrink-0 rounded-lg border border-border" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold">{banner.title}</p>
      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[banner.publicationStatus]}`}>{STATUS_LABEL[banner.publicationStatus]}</span>
    </div>
  </button>;
}

export function BannerManager({ banners, loading, error, onRefresh }: { banners: AdminBanner[] | null; loading: boolean; error: string | null; onRefresh: () => Promise<void> }) {
  const { authentication } = useDashboardSession();
  const accessToken = authentication.accessToken;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const chosenId = selectedId ?? banners?.[0]?.id;
  const selected = banners?.find(banner => banner.id === chosenId) ?? null;

  return <section className="rounded-xl border border-border bg-card">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
      <div><h2 className="font-bold">استودیوی بنر</h2><p className="mt-1 text-sm text-muted-foreground">بنر بسازید، تصویر و لینک بگذارید و منتشر کنید. فقط بنر منتشرشده با تصویر در فروشگاه دیده می‌شود.</p></div>
      <button type="button" disabled={loading} onClick={() => void onRefresh().catch(() => undefined)} className={secondaryButton}><RefreshCw size={15} />بازخوانی</button>
    </div>
    <div className="p-5">
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(220px,300px)_1fr]">
        <div className="space-y-3">
          <CreateBanner accessToken={accessToken} onCreated={created => { setSelectedId(created.id); void onRefresh().catch(() => undefined); }} />
          {banners === null
            ? (loading ? <p role="status" className="text-sm text-muted-foreground">در حال دریافت بنرها…</p> : null)
            : banners.length === 0
              ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">هنوز بنری ثبت نشده است. با دکمهٔ بالا اولین بنر را بسازید.</p>
              : <div className="space-y-2">{banners.map(banner => <BannerListItem key={banner.id} banner={banner} selected={banner.id === chosenId} onSelect={() => setSelectedId(banner.id)} />)}</div>}
        </div>
        <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
          {selected ? <BannerEditor key={selected.id} banner={selected} accessToken={accessToken} onRefresh={onRefresh} />
            : <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground"><Globe size={22} />{banners && banners.length > 0 ? "یک بنر را از فهرست انتخاب کنید." : "برای ویرایش، ابتدا یک بنر بسازید."}</div>}
        </div>
      </div>
    </div>
  </section>;
}

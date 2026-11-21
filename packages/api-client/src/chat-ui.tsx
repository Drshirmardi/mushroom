"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Download, FileText, GripVertical, Maximize2, Mic, MicOff, Minimize2, Paperclip, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Video, VideoOff, X } from "lucide-react";
import { chatDocumentExtensions, chatMediaExtensions, createChatId, maxChatAttachment, type ChatCall, type ChatMessage, type PreviousChat, reconcileChatMessages, type createChatEngine } from "./chat-engine.js";

type Engine = ReturnType<typeof createChatEngine>;
type ChatCredentials = { engine: Engine; token: string; conversationId: string };
const numbers = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const fileSize = (size: number) => size >= 1024 * 1024
  ? numbers.format(size / (1024 * 1024)) + " مگابایت"
  : numbers.format(Math.max(1, size / 1024)) + " کیلوبایت";
const sizeError = "حجم فایل باید حداکثر ۲۰ مگابایت باشد.";
const formatError = "فرمت یا محتوای فایل قابل پذیرش نیست.";
const attachmentOptions = [
  { id: "media", label: "عکس و ویدئو", extensions: chatMediaExtensions, mime: "image/jpeg,image/png,video/mp4,video/quicktime" },
  { id: "document", label: "سند", extensions: chatDocumentExtensions, mime: "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
] as const;
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

function FileInfo({ name, size }: { name: string; size: number }) {
  return <span className="min-w-0 flex-1 text-start">
    <bdi className="block break-all font-semibold">{name}</bdi>
    <span className="block text-xs opacity-80"><bdi>{name.slice(name.lastIndexOf(".") + 1).toUpperCase()}</bdi> · {fileSize(size)}</span>
  </span>;
}

export function AttachmentPicker({ engine, token, conversationId, disabled, buttonClassName, onSent }: ChatCredentials & {
  disabled: boolean;
  buttonClassName?: string;
  onSent: (message: ChatMessage) => void;
}) {
  const [draft, setDraft] = useState<{ file: File; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const pickerId = useId();
  const root = useRef<HTMLDivElement>(null);
  const paperclip = useRef<HTMLButtonElement>(null);
  const firstChoice = useRef<HTMLInputElement>(null);
  const [focusedChoice, setFocusedChoice] = useState<string>();
  const flight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const menuOpen = menu && !disabled && !busy;
  useEffect(() => {
    if (!menuOpen) return;
    const pickerRoot = root.current;
    firstChoice.current?.focus();
    function dismissOutside(event: globalThis.PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setMenu(false);
    }
    function cancelSelection(event: Event) {
      if (event.target instanceof HTMLInputElement && event.target.type === "file") {
        setMenu(false);
        paperclip.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismissOutside, true);
    pickerRoot?.addEventListener("cancel", cancelSelection, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      pickerRoot?.removeEventListener("cancel", cancelSelection, true);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenu(false);
    paperclip.current?.focus();
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || disabled || busy) return;
    closeMenu();
    setSent(false);
    try {
      const extension = file.name.match(/\.[^.]+$/)?.[0].toLowerCase() ?? "";
      if (!file.size) { setError("فایل خالی است یا خوانده نشد."); return; }
      if (file.size > maxChatAttachment) { setError(sizeError); return; }
      if (extension === ".heic" || extension === ".heif") {
        setError("برای ارسال این عکس آیفون، آن را با فرمت JPEG یا PNG ذخیره و دوباره انتخاب کنید.");
        return;
      }
      if (!attachmentOptions.some(option => option.extensions.split(",").includes(extension))) { setError(formatError); return; }
      setDraft({ file, id: createChatId() });
      setError("");
    } catch {
      setError("انتخاب فایل انجام نشد. دوباره تلاش کنید.");
    }
  }

  async function send() {
    if (!draft || disabled || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const message = await engine.upload(token, conversationId, draft.file, draft.id);
      if (!mounted.current) return;
      onSent(message);
      setDraft(null);
      setSent(true);
    } catch (failure) {
      if (!mounted.current) return;
      const code = failure instanceof Error ? failure.message : "";
      setError(code === "CHAT_REQUEST_503" ? "سرویس پیوست موقتاً در دسترس نیست. دوباره تلاش کنید."
        : code === "CHAT_UPLOAD_CONNECTION_FAILED" ? "ارسال فایل به‌دلیل کندی اتصال کامل نشد. دوباره تلاش کنید."
        : code === "CHAT_REQUEST_413" ? sizeError
        : code === "CHAT_REQUEST_400" || code === "CHAT_REQUEST_415" ? formatError
        : code === "CHAT_REQUEST_401" || code === "CHAT_REQUEST_403" ? "دسترسی ارسال فایل در دسترس نیست."
        : "ارسال فایل تأیید نشد. اتصال را بررسی و دوباره تلاش کنید.");
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <div ref={root} className="relative shrink-0" onKeyDown={event => {
    if (event.key === "Escape" && menuOpen) { event.stopPropagation(); closeMenu(); }
  }}>
    <button ref={paperclip} type="button" aria-label="افزودن پیوست" title="افزودن پیوست" aria-expanded={menuOpen} disabled={disabled || busy} onClick={() => { setSent(false); setMenu(!menu); }} className={iconButton + " " + (buttonClassName ?? "text-muted-foreground hover:bg-muted")}>
      <Paperclip size={20} aria-hidden="true" />
    </button>
    {attachmentOptions.map(option => <input key={option.id} ref={option.id === "media" ? firstChoice : undefined}
      id={pickerId + option.id} type="file" className="sr-only" aria-label={option.label} aria-hidden={!menuOpen} disabled={!menuOpen}
      accept={option.mime + "," + option.extensions} onChange={selectFile} onFocus={() => setFocusedChoice(option.id)}
      onBlur={() => setFocusedChoice(undefined)} />)}
    {menuOpen && <div className="absolute bottom-full left-0 z-20 mb-2 grid w-44 rounded-xl border border-border bg-background p-1 text-sm shadow-lg">
      {attachmentOptions.map(option => <label key={option.id} htmlFor={pickerId + option.id}
        className={"flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-start hover:bg-muted" + (focusedChoice === option.id ? " outline-2 outline-primary" : "")}>{option.label}</label>)}
    </div>}
    {(draft || error || sent) && <div className="absolute bottom-full left-0 z-10 mb-2 w-[min(75vw,21rem)] rounded-xl border border-border bg-background p-2 text-sm text-foreground shadow-lg">
      {draft && <div className="flex items-center gap-2">
        <FileInfo name={draft.file.name} size={draft.file.size} />
        <button type="button" disabled={disabled || busy} onClick={() => void send()} className="min-h-11 rounded-lg bg-primary px-2 text-primary-foreground disabled:opacity-50">
          {busy ? "در حال ارسال…" : error ? "تلاش دوباره" : "ارسال فایل"}
        </button>
        <button type="button" aria-label="برداشتن فایل" disabled={busy} onClick={() => { setDraft(null); setError(""); }} className={iconButton}><X size={18} aria-hidden="true" /></button>
      </div>}
      {error && <p role="alert" className="p-1 text-red-700">{error}</p>}
      {sent && <div className="flex items-center justify-between"><span role="status">فایل ارسال شد.</span><button type="button" aria-label="بستن" className={iconButton} onClick={() => setSent(false)}><X size={18} aria-hidden="true" /></button></div>}
      {error && !draft && <button type="button" className="min-h-11 px-2" onClick={() => setError("")}>بستن</button>}
    </div>}
  </div>;
}

export function ChatAttachmentCard({ engine, token, conversationId, message, imageCache }: ChatCredentials & { message: ChatMessage; imageCache?: Map<string, Blob> }) {
  const attachment = message.attachment!;
  const image = ["image/jpeg", "image/png"].includes(attachment.mime);
  const video = attachment.mime === "video/mp4" || attachment.mime === "video/quicktime";
  const media = image || video;
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!media || !card.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, [media]);

  const load = media && (visible || open);
  useEffect(() => {
    setUrl("");
    setFailed(false);
    if (!load) return;
    const abort = new AbortController();
    let objectUrl = "";
    const key = conversationId + ":" + message.id;
    const cache = image ? imageCache : undefined;
    const cached = cache?.get(key);
    void (cached ? Promise.resolve(cached) : engine.attachmentBlob(token, conversationId, message.id, abort.signal)).then(blob => {
      if (abort.signal.aborted) return;
      if (cache && blob.size <= 12 * 1024 * 1024) {
        cache.delete(key);
        cache.set(key, blob);
        let size = [...cache.values()].reduce((bytes, item) => bytes + item.size, 0);
        for (const [oldKey, oldBlob] of cache) {
          if (size <= 12 * 1024 * 1024 && cache.size <= 24) break;
          cache.delete(oldKey);
          size -= oldBlob.size;
        }
      }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [engine, token, conversationId, message.id, load, image, imageCache]);

  async function download() {
    if (downloading) return;
    setDownloadError(false);
    setDownloading(true);
    try { await engine.download(token, conversationId, message); }
    catch { setDownloadError(true); }
    finally { setDownloading(false); }
  }

  function enlarge() {
    if (!dialog.current?.open) dialog.current?.showModal();
    card.current?.querySelector("video")?.pause();
    setOpen(true);
  }

  return <div ref={card} className="grid min-w-0 gap-1.5">
    {media && !failed && <div className={image
      ? "relative w-fit max-w-full overflow-hidden rounded-xl border border-current/20 bg-black/10"
      : "relative grid aspect-video w-[min(58vw,20rem)] max-w-full place-items-center overflow-hidden rounded-xl border border-current/20 bg-black/10"}>
      {url && image && <button type="button" className="block max-w-full cursor-zoom-in" onClick={enlarge} aria-label="بازکردن تصویر">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.name} onError={() => setFailed(true)} className="block max-h-[20rem] max-w-full object-contain" />
      </button>}
      {url && image && <button type="button" aria-label={"دانلود " + attachment.name} title="دانلود تصویر" onClick={() => void download()} disabled={downloading} className={iconButton + " absolute end-2 top-2 bg-black/70 text-white shadow-sm"}>
        <Download size={18} aria-hidden="true" />
      </button>}
      {url && video && <><video src={url + "#t=0.001"} playsInline preload="metadata" controls aria-label={attachment.name} onError={() => setFailed(true)} className="size-full bg-black object-contain" />
        <button type="button" aria-label="بازکردن ویدئو در نمای بزرگ" onClick={enlarge} className={iconButton + " absolute end-1 top-1 bg-black/70 text-white"}><Maximize2 size={16} aria-hidden="true" /></button></>}
      {!url && <span className="text-xs opacity-80">پیش‌نمایش {image ? "تصویر" : "ویدئو"}</span>}
    </div>}
    {(!image || failed) && <div className="flex min-w-0 items-center gap-2 rounded-lg border border-current/20 px-2">
      {video ? <Video size={22} className="shrink-0" aria-hidden="true" /> : !image && <FileText size={22} className="shrink-0" aria-hidden="true" />}
      <FileInfo name={attachment.name} size={attachment.size} />
      <button type="button" aria-label={"دانلود " + attachment.name} title="دانلود" onClick={() => void download()} disabled={downloading} className={iconButton}>
        <Download size={18} aria-hidden="true" />
      </button>
    </div>}
    {(downloadError || failed) && <p role="status" className="text-xs">{downloadError ? "دانلود انجام نشد. دوباره تلاش کنید." : "پیش‌نمایش در دسترس نیست. می‌توانید فایل را دانلود کنید."}</p>}
    {media && <dialog ref={dialog} onClose={() => setOpen(false)} aria-label="پیش‌نمایش پیوست" className="m-auto max-h-[90dvh] max-w-[94vw] rounded-2xl bg-background p-3 text-foreground backdrop:bg-black/75">
      <div className="mb-2 flex justify-end gap-2">
        <button type="button" aria-label="دانلود فایل" disabled={downloading} onClick={() => void download()} className={iconButton}><Download size={20} aria-hidden="true" /></button>
        <button type="button" autoFocus aria-label="بستن پیش‌نمایش" onClick={() => dialog.current?.close()} className={iconButton}><X size={22} aria-hidden="true" /></button>
      </div>
      {open && url && (image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={attachment.name} className="max-h-[75dvh] max-w-full object-contain" />
        : <video src={url} playsInline controls className="max-h-[75dvh] max-w-full" />)}
    </dialog>}
  </div>;
}

export const callLabel = (mode: ChatCall["mode"]) => mode === "AUDIO" ? "تماس صوتی" : "تماس تصویری";
export const callLive = (call: ChatCall | null) => call?.status === "ACTIVE" || call?.status === "RINGING";
export function callStatus(call: ChatCall) {
  if (call.status === "ACTIVE") return call.connectedAt ? "تماس برقرار است" : "پاسخ داده شد؛ در حال اتصال…";
  if (call.status === "ENDED") return call.connectedAt ? "پاسخ داده شد" : "پیش از اتصال پایان یافت";
  return { RINGING: "در حال زنگ‌زدن…", DECLINED: "رد شد", MISSED: "بی‌پاسخ", CANCELLED: "لغو شد", FAILED: "اتصال برقرار نشد" }[call.status];
}

export function ChatCallCard({ engine, token, conversationId, id, time, incoming, eventDriven }: ChatCredentials & { id: string; time: string; incoming: boolean; eventDriven?: boolean }) {
  const [call, setCall] = useState<ChatCall | null>(null);
  useEffect(() => {
    setCall(null);
    return engine.watchCall(token, conversationId, id, setCall, eventDriven ? "card" : undefined);
  }, [engine, token, conversationId, id, eventDriven]);
  const Icon = !call ? Phone : ["MISSED", "DECLINED", "FAILED"].includes(call.status) ? PhoneMissed : incoming ? PhoneIncoming : PhoneOutgoing;
  const iconTone = call?.connectedAt ? "text-emerald-700" : call?.status === "DECLINED" ? "text-red-700" : "text-primary";
  const duration = call?.connectedAt && call.endedAt ? Math.max(0, Math.floor((Date.parse(call.endedAt) - Date.parse(call.connectedAt)) / 1000)) : null;
  return <div className="mx-auto flex max-w-[min(76%,28rem)] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm">
    <Icon size={18} className={`shrink-0 ${iconTone}`} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="font-semibold">{call ? callLabel(call.mode) : "تماس ویزیت"}</p>
      <p className="text-xs text-muted-foreground">{call ? callStatus(call) : "وضعیت تماس در دسترس نیست"}{duration !== null && " · " + numbers.format(duration) + " ثانیه"}</p>
    </div>
    <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
  </div>;
}

export const callIconButton = "mushroom-call-button inline-grid shrink-0 place-items-center disabled:opacity-50";

const callWindowMargin = 12;
const keyboardMove: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -24], ArrowDown: [0, 24], ArrowLeft: [-24, 0], ArrowRight: [24, 0],
};

function keepCallWindowVisible(left: number, top: number, width: number, height: number) {
  return {
    left: Math.max(callWindowMargin, Math.min(left, document.documentElement.clientWidth - width - callWindowMargin)),
    top: Math.max(callWindowMargin, Math.min(top, document.documentElement.clientHeight - height - callWindowMargin)),
  };
}

type CallMediaPreferences = { microphone: boolean; camera: boolean };

export function CallPanel({ call, name, frame, error, controls, endControl, joining, floating = false, recover, onMinimizedChange, onEnded, expandRequest, returnLink }: { call: ChatCall; name: string; frame: string; error: string; controls: ReactNode; endControl?: ReactNode; joining: boolean; floating?: boolean; recover?: (media?: CallMediaPreferences) => void; onMinimizedChange?: (minimized: boolean, height?: number) => void; onEnded?: (reason?: string) => void; expandRequest?: number; returnLink?: ReactNode }) {
  const [minimized, setMinimized] = useState(false);
  useEffect(() => { setMinimized(false); }, [expandRequest]);
  const [recovering, setRecovering] = useState(false);
  const [abandonedFrame, setAbandonedFrame] = useState("");
  const [playerError, setPlayerError] = useState("");
  const recovery = useRef<{ deadline: number; attempts: number; timer: ReturnType<typeof setTimeout>; retry?: ReturnType<typeof setTimeout>; media?: CallMediaPreferences } | null>(null);
  const retryNow = useRef<() => void>(() => {});
  function clearRecovery() {
    clearTimeout(recovery.current?.timer);
    clearTimeout(recovery.current?.retry);
    recovery.current = null;
    setRecovering(false);
  }
  const callbacks = useRef({ recover, onEnded });
  useLayoutEffect(() => { callbacks.current = { recover, onEnded }; }, [recover, onEnded]);
  useEffect(() => {
    const online = () => retryNow.current();
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      clearTimeout(recovery.current?.timer);
      clearTimeout(recovery.current?.retry);
    };
  }, []);

  const [anchor, setAnchor] = useState({ right: false, bottom: true, x: 12, y: 12 });
  const [manualSize, setManualSize] = useState<{ width: number; height: number }>();
  const [aspect, setAspect] = useState<number>();
  const [media, setMedia] = useState<{ microphone: boolean; camera: boolean; denied: boolean }>();
  const [cameraNotice, setCameraNotice] = useState(false);
  useEffect(() => {
    onMinimizedChange?.(minimized, cameraNotice ? 80 : 56);
    return () => onMinimizedChange?.(false);
  }, [minimized, cameraNotice, onMinimizedChange]);
  const [duration, setDuration] = useState(0);
  const resize = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!minimized || !call.connectedAt) return;
    const connected = Date.parse(call.connectedAt);
    const tick = () => setDuration(Math.max(0, Math.floor((Date.now() - connected) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [minimized, call.connectedAt]);
  const windowRef = useRef<HTMLElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [readyFrame, setReadyFrame] = useState("");
  const [failedFrame, setFailedFrame] = useState("");
  const [videoFrame, setVideoFrame] = useState("");
  const player = useRef<HTMLIFrameElement>(null);
  function startRecovery() {
    if (recovery.current) return;
    setRecovering(true);
    setPlayerError("");
    recovery.current = {
      deadline: Date.now() + 75_000,
      attempts: 0,
      timer: setTimeout(() => {
        clearRecovery();
        const expiredFrame = player.current?.getAttribute("src") ?? "";
        setAbandonedFrame(expiredFrame);
        setFailedFrame(expiredFrame);
      }, 75_000),
    };
  }
  function scheduleRecovery(immediate = false) {
    const attempt = recovery.current;
    if (!attempt || !callbacks.current.recover) return;
    clearTimeout(attempt.retry);
    const delays = [0, 2000, 5000, 10000, 20000];
    const delay = delays[attempt.attempts];
    if (delay === undefined || Date.now() + (immediate ? 0 : delay) >= attempt.deadline) { clearRecovery(); return; }
    attempt.retry = setTimeout(() => {
      if (recovery.current !== attempt || Date.now() >= attempt.deadline) return;
      attempt.retry = undefined;
      attempt.attempts++;
      callbacks.current.recover?.(attempt.media);
    }, immediate ? 0 : delay);
  }
  useLayoutEffect(() => {
    retryNow.current = () => { if (recovery.current?.retry) scheduleRecovery(true); };
    if (error === "تماس دیگر در دسترس نیست.") { clearRecovery(); return; }
    if (!frame && error === "ورود به تماس ممکن نشد. دوباره تلاش کنید.") {
      if (recovery.current || callbacks.current.recover) {
        startRecovery();
        scheduleRecovery();
      }
      return;
    }
    if (!frame) return;
    const expectedOrigin = new URL(frame).origin;
    const waiting = recovery.current;
    const connectTimeout = waiting?.attempts ? setTimeout(() => {
      if (recovery.current !== waiting) return;
      setFailedFrame(frame);
      scheduleRecovery();
    }, 10_000) : undefined;
    function receive(event: MessageEvent) {
      if (event.origin !== expectedOrigin || event.source !== player.current?.contentWindow) return;
      if (recovery.current && recovery.current.deadline <= Date.now() && event.data?.type !== "mushroom-call:ended") return;
      switch (event.data?.type) {
        case "mushroom-call:ended":
          clearRecovery();
          callbacks.current.onEnded?.(typeof event.data.reason === "string" ? event.data.reason : undefined);
          break;
        case "mushroom-call:replaced":
          clearRecovery();
          setAbandonedFrame(frame);
          setFailedFrame(frame);
          setPlayerError("تماس در تب یا دستگاه دیگری ادامه دارد.");
          break;
        case "mushroom-call:recovering":
          startRecovery();
          break;
        case "mushroom-call:connected":
          clearRecovery();
          break;
        case "mushroom-call:recover": {
          setFailedFrame(frame);
          setReadyFrame("");
          setVideoFrame("");
          setMedia(undefined);
          const detail = event.data;
          const permissionErrors: Record<string, string> = {
            UserGestureRequired: "برای فعال‌کردن میکروفون، تلاش مجدد را بزنید.",
            NotAllowedError: "دسترسی میکروفون را در تنظیمات مرورگر یا بله فعال کنید.",
            NotFoundError: "میکروفون پیدا نشد. دستگاه صدا را بررسی کنید.",
            NotReadableError: "میکروفون در دسترس نیست. برنامه‌های دیگری را که از آن استفاده می‌کنند ببندید.",
          };
          if (detail.permission === true) {
            clearRecovery();
            setPlayerError(permissionErrors[detail.reason] ?? "دسترسی به میکروفون ممکن نشد.");
            break;
          }
          startRecovery();
          const attempt = recovery.current;
          clearTimeout(connectTimeout);
          if (attempt) attempt.media = { microphone: detail.microphone !== false, camera: detail.camera === true };
          scheduleRecovery();
          break;
        }
        case "mushroom-call:ready":
          setReadyFrame(frame);
          setFailedFrame("");
          setPlayerError("");
          break;
        case "mushroom-call:media-state":
          setMedia({ microphone: event.data.microphone === true, camera: event.data.camera === true, denied: event.data.denied === true });
          if (event.data.camera === true) setCameraNotice(false);
          break;
        case "mushroom-call:camera-denied":
          setCameraNotice(true);
          break;
        case "mushroom-call:camera-prompt":
          setMinimized(false);
          break;
        case "mushroom-call:remote-video":
          setAspect(typeof event.data.aspect === "number" && Number.isFinite(event.data.aspect) ? event.data.aspect : undefined);
          setVideoFrame(event.data.visible === true ? frame : "");
          break;
      }
    }
    window.addEventListener("message", receive);
    return () => { clearTimeout(connectTimeout); window.removeEventListener("message", receive); };
  }, [frame, error]);

  function anchorAt(left: number, top: number, width: number, height: number) {
    const box = keepCallWindowVisible(left, top, width, height);
    const viewport = document.documentElement;
    const right = box.left + width / 2 > viewport.clientWidth / 2;
    const bottom = box.top + height / 2 > viewport.clientHeight / 2;
    setAnchor({ right, bottom, x: right ? viewport.clientWidth - box.left - width : box.left,
      y: bottom ? viewport.clientHeight - box.top - height : box.top });
  }

  function sendControl(control: "camera" | "microphone") {
    if (!frame) return;
    player.current?.contentWindow?.postMessage({ type: "mushroom-call:control", control }, new URL(frame).origin);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect || event.button !== 0 || !event.isPrimary) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveWindow(event: PointerEvent<HTMLButtonElement>) {
    const offset = drag.current;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect || offset?.pointerId !== event.pointerId) return;
    anchorAt(event.clientX - offset.x, event.clientY - offset.y, rect.width, rect.height);
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const step = keyboardMove[event.key];
    const rect = windowRef.current?.getBoundingClientRect();
    if (!step || !rect) return;
    event.preventDefault();
    anchorAt(rect.left + step[0], rect.top + step[1], rect.width, rect.height);
  }

  const active = call.status === "ACTIVE";
  const playing = Boolean(frame && failedFrame !== frame);
  const ready = playing && readyFrame === frame;
  const label = callLabel(call.mode);
  const size = manualSize ?? (videoFrame === frame && aspect
    ? aspect < 1 ? { width: 400, height: 520 } : { width: 560, height: 420 }
    : { width: 360, height: 380 });
  const width = `min(${minimized ? Math.max(320, size.width) : size.width}px, clamp(320px, 45vw, 640px), calc(100vw - 24px))`;
  const height = minimized ? (cameraNotice ? "76px" : "56px") : `min(${size.height}px, 640px, 75dvh, calc(100dvh - 24px))`;
  const floatingStyle = floating ? {
    width, height,
    [anchor.right ? "right" : "left"]: `clamp(12px, ${anchor.x}px, calc(100vw - ${width} - 12px))`,
    [anchor.bottom ? "bottom" : "top"]: `clamp(12px, ${anchor.y}px, calc(100dvh - ${height} - 12px))`,
  } : undefined;
  const panelClass = floating ? "overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
    : minimized ? "inset-x-2 top-[max(8px,env(safe-area-inset-top))] mx-auto max-w-sm rounded-2xl shadow-xl" : "inset-0 overflow-hidden";
  const MicIcon = media?.microphone ? Mic : MicOff;
  const CameraIcon = media?.camera ? Video : VideoOff;
  const compactControls = minimized && <div className="flex shrink-0 items-center gap-0.5 pe-1">
    <button type="button" className={callIconButton} aria-label="میکروفون" aria-pressed={media?.microphone} disabled={!ready || !media} onClick={() => sendControl("microphone")}><MicIcon size={18} /></button>
    <button type="button" className={callIconButton} aria-label="دوربین" aria-pressed={media?.camera} disabled={!ready || !media} onClick={() => sendControl("camera")}><CameraIcon size={18} /></button>
    {endControl}
    <button type="button" className={callIconButton} aria-label="باز کردن تماس جاری" onClick={() => setMinimized(false)}><Maximize2 size={18} /></button>
  </div>;
  const summary = recovering ? "در حال اتصال مجدد…" : call.connectedAt
    ? [Math.floor(duration / 60), duration % 60].map(value => String(value).padStart(2, "0")).join(":") : callStatus(call);
  return <section ref={windowRef} dir="rtl" aria-label={label} style={floatingStyle} className={"mushroom-call-surface fixed isolate z-[1000] " + panelClass}>
    {floating && <header className="absolute inset-x-0 top-0 z-30 flex h-14 border-b border-white/15">
      <button type="button" aria-label={"جابجایی پنجره تماس با " + name} title="برای جابجایی بکشید یا از کلیدهای جهت‌نما استفاده کنید"
        className="flex min-w-0 flex-1 touch-none cursor-grab select-none items-center gap-2 px-4 text-start active:cursor-grabbing"
        onPointerDown={startDrag} onPointerMove={moveWindow}
        onLostPointerCapture={() => { drag.current = null; }} onKeyDown={moveWithKeyboard}>
        <GripVertical size={18} aria-hidden="true" className="shrink-0 opacity-60" />
        <span className="min-w-0"><span className="block truncate text-sm font-bold">{name}</span>{minimized && <span className="block truncate text-xs opacity-75">{summary}</span>}</span>
      </button>
      {returnLink}
      {compactControls}
      {!minimized && manualSize && <button type="button" className={callIconButton + " m-1"} aria-label="اندازهٔ خودکار" title="اندازهٔ خودکار" onClick={() => setManualSize(undefined)}><Maximize2 size={18} /></button>}
      {!minimized && active && <button type="button" className={callIconButton + " m-1"}
        aria-label={minimized ? "باز کردن تماس جاری" : "کوچک‌کردن تماس"} onClick={() => setMinimized(!minimized)}>
        {minimized ? <Maximize2 size={18} aria-hidden="true" /> : <Minimize2 size={18} aria-hidden="true" />}
      </button>}
    </header>}
    {!floating && minimized && <header className="flex h-14 items-center justify-between gap-1 ps-3">
      <div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="truncate text-xs opacity-75">{summary}</p></div>
      {compactControls}
    </header>}
    {!floating && !minimized && active && <button type="button" aria-label="کوچک‌کردن تماس" onClick={() => setMinimized(true)}
      className={callIconButton + " absolute start-3 top-[max(12px,env(safe-area-inset-top))] z-30"}><Minimize2 size={18} /></button>}
    {minimized && cameraNotice && <p role="status" className={floating ? "absolute inset-x-2 top-14 text-xs" : "absolute inset-x-0 top-full rounded-b-xl bg-[var(--call-background)] px-2 py-1 text-xs"}>مجوز دوربین را از تنظیمات مرورگر فعال کنید.</p>}
    {floating && !minimized && <button type="button" aria-label="تغییر اندازهٔ پنجره تماس" title="تغییر اندازهٔ پنجره"
      className="absolute bottom-0 right-0 z-30 grid size-8 touch-none cursor-nwse-resize place-items-center opacity-70"
      onPointerDown={event => {
        const rect = windowRef.current?.getBoundingClientRect();
        if (!rect || event.button !== 0 || !event.isPrimary) return;
        resize.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
        setAnchor({ right: false, bottom: false, x: rect.left, y: rect.top });
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const start = resize.current;
        if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        setManualSize({ width: Math.max(300, start.width + event.clientX - start.x), height: Math.max(295, start.height + event.clientY - start.y) });
      }}
      onLostPointerCapture={() => {
        resize.current = null;
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) anchorAt(rect.left, rect.top, rect.width, rect.height);
      }}
      onKeyDown={event => {
        const step = keyboardMove[event.key];
        if (!step) return;
        event.preventDefault();
        setManualSize({ width: Math.max(300, size.width + step[0]), height: Math.max(295, size.height + step[1]) });
      }}><GripVertical size={16} className="rotate-45" aria-hidden="true" /></button>}
    <div inert={minimized} aria-hidden={minimized} className={minimized ? "pointer-events-none fixed inset-0 invisible" : floating ? "absolute inset-x-0 bottom-0 top-14" : "absolute inset-0"}>
      {frame && abandonedFrame !== frame && <iframe key={frame} ref={player} title={label} className={"mushroom-call-frame absolute inset-0 size-full border-0 " + (playing ? "" : "invisible")} src={frame} sandbox="allow-scripts allow-same-origin" allow="camera; microphone; autoplay" referrerPolicy="no-referrer" />}
      {!floating && active && <p className="mushroom-call-name pointer-events-none absolute inset-x-16 top-[max(20px,env(safe-area-inset-top))] z-10 truncate text-center text-lg font-bold">{name}</p>}
      {(!playing || videoFrame !== frame) && <div className="pointer-events-none absolute inset-0 z-10 grid place-content-center justify-items-center gap-3 px-5 pb-16 text-center">
        <div className="mushroom-call-avatar grid size-28 place-items-center rounded-full text-4xl font-bold" aria-hidden="true">{name.trim().slice(0, 1) || "م"}</div>
        {((joining && !playing) || recovering) && <p role="status">{recovering ? "در حال اتصال مجدد…" : "در حال اتصال…"}</p>}
        {!active && <>{!floating && <p className="text-2xl font-bold">{name}</p>}<p role="status" className="opacity-80">{label} · {callStatus(call)}</p></>}
      </div>}
      {(!playing || !ready) && <div className={"mushroom-call-host-actions absolute z-20 flex flex-col items-center gap-3 px-4 " + (playing ? "end-0 top-[max(12px,env(safe-area-inset-top))]" : "inset-x-0 bottom-0")}>
        {!playing && !recovering && (error || playerError || failedFrame === frame && frame) && <p role="alert" className="max-w-sm text-center text-sm">{error || playerError || "اتصال برقرار نشد. مجوز میکروفون و شبکه را بررسی کنید."}</p>}
        <div className="flex flex-wrap justify-center gap-4" dir="ltr">{playing || joining || recovering ? endControl : controls}</div>
      </div>}
    </div>
  </section>;
}

export function HangUpButton({ onClick, disabled, label = "پایان تماس" }: { onClick: () => void; disabled: boolean; label?: string }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={callIconButton + " mushroom-call-end"}><PhoneOff size={22} aria-hidden="true" /></button>;
}

export function useCallTab(sessionKey: string) {
  const [owner, setOwner] = useState(false);
  const takeover = useRef<() => void>(() => {});
  useEffect(() => {
    setOwner(false);
    if (!sessionKey) return;
    if (!navigator.locks || typeof BroadcastChannel === "undefined") { setOwner(true); return; }
    const key = "mushroom-media:" + sessionKey;
    const channel = new BroadcastChannel(key);
    let disposed = false;
    let waiting = new AbortController();
    let release: (() => void) | undefined;
    function request(steal = false) {
      waiting.abort();
      waiting = new AbortController();
      const options = steal ? { steal: true } : { signal: waiting.signal };
      void navigator.locks.request(key, options, async () => {
        if (disposed) return;
        setOwner(true);
        await new Promise<void>(resolve => { release = resolve; });
        release = undefined;
        if (!disposed) setOwner(false);
      }).catch(() => {});
    }
    channel.onmessage = ({ data }) => {
      if (data !== "transfer" || !release) return;
      setOwner(false);
      release();
      request();
    };
    takeover.current = () => { channel.postMessage("transfer"); request(true); };
    request();
    return () => {
      disposed = true;
      waiting.abort();
      release?.();
      channel.close();
      takeover.current = () => {};
    };
  }, [sessionKey]);
  return { owner, transfer: () => takeover.current() };
}

export function useCallFrame(engine: Engine, token: string, id: string | undefined) {
  const [granted, setGranted] = useState<{ id: string; url: string; version: number } | null>(null);
  const [frameError, setFrameError] = useState("");
  const [version, refresh] = useState(0);
  const allowPrompt = useRef(false);
  const preferences = useRef<{ id: string; media: CallMediaPreferences } | undefined>(undefined);
  const currentToken = useRef(token);
  useLayoutEffect(() => { currentToken.current = token; }, [token]);
  useEffect(() => {
    setGranted(null);
    setFrameError("");
    if (!id) return;
    let active = true;
    void engine.call(currentToken.current, id).then(current => {
      if (current.status !== "ACTIVE" || !active) throw new Error("CHAT_CALL_ENDED");
      return engine.callGrant(currentToken.current, id).then(grant => ({ ...grant, resumed: !!current.connectedAt }));
    }).then(({ url, resumed }) => {
      const frameUrl = new URL(url);
      frameUrl.searchParams.set("embedOrigin", window.location.origin);
      frameUrl.searchParams.set("autoJoin", "1");
      if (resumed && !allowPrompt.current) frameUrl.searchParams.set("resume", "1");
      allowPrompt.current = false;
      if (preferences.current?.id === id) {
        frameUrl.searchParams.set("microphone", String(preferences.current.media.microphone));
        frameUrl.searchParams.set("camera", String(preferences.current.media.camera));
      }
      if (active) setGranted({ id, url: frameUrl.href, version });
    }).catch(error => {
      if (active) setFrameError(["CHAT_CALL_ENDED", "CHAT_FORBIDDEN", "FORBIDDEN", "CONFLICT", "CHAT_REQUEST_403", "CHAT_REQUEST_409"].includes(error.message)
        ? "تماس دیگر در دسترس نیست." : "ورود به تماس ممکن نشد. دوباره تلاش کنید.");
    });
    return () => { active = false; };
  }, [engine, id, version]);
  const frame = granted && granted.id === id && granted.version === version ? granted.url : "";
  return { frame, frameError, joining: Boolean(id && !frame && !frameError), reconnect: (media?: CallMediaPreferences, automatic = false) => { allowPrompt.current = !automatic; if (id && media) preferences.current = { id, media }; refresh(previous => previous + 1); } };
}

const previousDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" });

type PreviousVisit = { entry: PreviousChat; messages: ChatMessage[]; cursor: string | null };

export function PreviousVisitMessages({
  engine, token, appointmentId, renderMessage, onLoadStart,
}: {
  engine: Engine;
  token: string;
  appointmentId: string;
  renderMessage: (message: ChatMessage, conversationId: string) => ReactNode;
  onLoadStart: () => void;
}) {
  const [visits, setVisits] = useState<PreviousVisit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [done, setDone] = useState(false);
  const scan = useRef<{ queue: PreviousChat[]; cursor?: string | null }>({ queue: [] });
  const visited = useRef(new Set<string>());
  const inFlight = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const scrollAnchor = useRef<{ viewport: HTMLElement; top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    scrollAnchor.current = null;
    if (anchor) {
      anchor.viewport.scrollTop = anchor.top + anchor.viewport.scrollHeight - anchor.height;
    }
  }, [visits]);

  function preservePosition() {
    const viewport = region.current?.closest<HTMLElement>(".chat-scroll-rail");
    if (viewport) scrollAnchor.current = { viewport, top: viewport.scrollTop, height: viewport.scrollHeight };
  }

  async function loadMore() {
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted || inFlight.current || done) return;
    inFlight.current = true;
    onLoadStart();
    setState("loading");
    try {
      const oldest = visits.at(-1);
      if (oldest?.cursor) {
        const page = await engine.older(token, oldest.entry.conversationId, oldest.cursor);
        if (signal.aborted) return;
        preservePosition();
        setVisits([...visits.slice(0, -1), {
          ...oldest,
          messages: page.items.reduce(reconcileChatMessages, oldest.messages),
          cursor: page.nextCursor ?? null,
        }]);
        setDone(!page.nextCursor && scan.current.cursor === null && !scan.current.queue.length);
      } else {
        const progress = scan.current;
        // Scan one appointment page per click. Skip empty conversations with bounded work.
        if (!progress.queue.length && progress.cursor !== null) {
          const page = await engine.previousConversations(token, appointmentId, progress.cursor);
          if (signal.aborted) return;
          progress.queue = page.items.filter(item => !visited.current.has(item.conversationId));
          progress.cursor = page.nextCursor;
        }
        for (let index = 0; index < 4 && progress.queue.length; index++) {
          const entry = progress.queue[0]!;
          if (visited.current.has(entry.conversationId)) { progress.queue.shift(); continue; }
          const page = await engine.archivedMessages(token, entry.conversationId);
          if (signal.aborted) return;
          progress.queue.shift();
          visited.current.add(entry.conversationId);
          if (page.items.length) {
            preservePosition();
            setVisits([...visits, {
              entry,
              messages: page.items.reduce(reconcileChatMessages, [] as ChatMessage[]),
              cursor: page.nextCursor ?? null,
            }]);
            setDone(!page.nextCursor && progress.cursor === null && !progress.queue.length);
            setState("ready");
            return;
          }
        }
        setDone(progress.cursor === null && !progress.queue.length);
      }
      setState("ready");
    } catch {
      if (!signal.aborted) setState("error");
    } finally {
      inFlight.current = false;
    }
  }

  return <div ref={region} className="space-y-3">
    <div className="text-center">
      {!done && <button type="button" disabled={state === "loading"} aria-busy={state === "loading"} onClick={() => void loadMore()} className="min-h-11 rounded-full border border-border bg-background px-3 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
        {state === "loading" ? "در حال دریافت…" : state === "error" ? "تلاش دوباره" : state === "idle" ? "نمایش پیام‌های ویزیت قبلی" : "نمایش پیام‌های قدیمی‌تر"}
      </button>}
      {state === "error" && <p role="alert" className="mt-1 text-sm text-red-700">دریافت پیام‌های ویزیت قبلی ممکن نشد.</p>}
      {done && !visits.length && <p role="status" className="text-sm text-muted-foreground">پیامی از ویزیت‌های قبلی وجود ندارد.</p>}
      {!done && state === "ready" && !visits.length && <p role="status" className="mt-1 text-sm text-muted-foreground">در این بخش از سابقه پیامی پیدا نشد.</p>}
    </div>
    {[...visits].reverse().map(({ entry, messages }) => (
      <section key={entry.conversationId} aria-label="پیام‌های ویزیت قبلی" className="space-y-2">
        <h3 className="my-3 flex items-center gap-2 text-center text-xs font-semibold text-muted-foreground sm:gap-3">
          <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-border" />
          <span className="max-w-[85%]">
            پیام‌های ویزیت قبلی · <time dateTime={entry.startsAt}>{previousDate.format(new Date(entry.startsAt))}</time>
          </span>
          <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-border" />
        </h3>
        <div className="space-y-2">
          {messages.map(message => renderMessage(message, entry.conversationId))}
        </div>
      </section>
    ))}
    <div ref={end}>
      {visits.length > 0 && <h3 className="my-3 flex items-center gap-2 text-center text-xs font-semibold text-muted-foreground sm:gap-3">
        <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-border" />
        <span>پیام‌های این ویزیت</span>
        <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-border" />
      </h3>}
    </div>
  </div>;
}

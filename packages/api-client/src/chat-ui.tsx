"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Download, FileText, Maximize2, Minimize2, Paperclip, Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Video, X } from "lucide-react";
import { chatDocumentExtensions, chatMediaExtensions, maxChatAttachment, type ChatCall, type ChatMessage, type PreviousChat, reconcileChatMessages, type createChatEngine } from "./chat-engine.js";

type Engine = ReturnType<typeof createChatEngine>;
type ChatCredentials = { engine: Engine; token: string; conversationId: string };
const numbers = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const fileSize = (size: number) => size >= 1024 * 1024
  ? numbers.format(size / (1024 * 1024)) + " مگابایت"
  : numbers.format(Math.max(1, size / 1024)) + " کیلوبایت";
const sizeError = "حجم فایل باید حداکثر ۲۰ مگابایت باشد.";
const formatError = "فرمت یا محتوای فایل قابل پذیرش نیست.";
const iconButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

function FileInfo({ name, size }: { name: string; size: number }) {
  return <span className="min-w-0 flex-1 text-start">
    <bdi className="block break-all font-semibold">{name}</bdi>
    <span className="block text-xs opacity-80"><bdi>{name.split(".").at(-1)?.toUpperCase()}</bdi> · {fileSize(size)}</span>
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
  const picker = useRef<HTMLInputElement>(null);
  const paperclip = useRef<HTMLButtonElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const flight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (menu) firstChoice.current?.focus(); }, [menu]);

  function choose(accept: string) {
    setMenu(false);
    if (!picker.current) return;
    picker.current.accept = accept;
    picker.current.click();
    paperclip.current?.focus();
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
        : code === "CHAT_REQUEST_413" ? sizeError
        : code === "CHAT_REQUEST_400" || code === "CHAT_REQUEST_415" ? formatError
        : code === "CHAT_REQUEST_401" || code === "CHAT_REQUEST_403" ? "دسترسی ارسال فایل در دسترس نیست."
        : "ارسال فایل تأیید نشد. اتصال را بررسی و دوباره تلاش کنید.");
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <div className="relative shrink-0" onKeyDown={event => {
    if (event.key === "Escape" && menu) { setMenu(false); paperclip.current?.focus(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(false); }}>
    <button ref={paperclip} type="button" aria-label="افزودن پیوست" title="افزودن پیوست" aria-expanded={menu && !disabled} disabled={disabled || busy} onClick={() => { setSent(false); setMenu(!menu); }} className={iconButton + " " + (buttonClassName ?? "text-muted-foreground hover:bg-muted")}>
      <Paperclip size={20} aria-hidden="true" />
    </button>
    <input ref={picker} type="file" hidden onChange={event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      setSent(false);
      if (file.size > maxChatAttachment) { setError(sizeError); return; }
      const ext = "." + file.name.split(".").at(-1)?.toLowerCase();
      if (!file.size || ![...chatMediaExtensions.split(","), ...chatDocumentExtensions.split(",")].includes(ext)) { setError(formatError); return; }
      setError("");
      setDraft({ file, id: crypto.randomUUID() });
    }} />
    {menu && !disabled && <div className="absolute bottom-full left-0 z-20 mb-2 grid w-44 rounded-xl border border-border bg-background p-1 text-sm shadow-lg">
      <button ref={firstChoice} type="button" onClick={() => choose(chatMediaExtensions)} className="min-h-11 rounded-lg px-3 text-start hover:bg-muted">عکس و ویدئو</button>
      <button type="button" onClick={() => choose(chatDocumentExtensions)} className="min-h-11 rounded-lg px-3 text-start hover:bg-muted">سند</button>
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

export function ChatAttachmentCard({ engine, token, conversationId, message }: ChatCredentials & { message: ChatMessage }) {
  const attachment = message.attachment!;
  const image = ["image/jpeg", "image/png"].includes(attachment.mime);
  const video = attachment.mime === "video/mp4";
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
    void engine.attachmentBlob(token, conversationId, message.id, abort.signal).then(blob => {
      if (abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [engine, token, conversationId, message.id, load]);

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

export function ChatCallCard({ engine, token, conversationId, id, time, incoming }: ChatCredentials & { id: string; time: string; incoming: boolean }) {
  const [call, setCall] = useState<ChatCall | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await engine.historyCall(token, conversationId, id);
        if (!active) return;
        setCall(next);
        if (!callLive(next)) return;
      } catch (error) {
        if (error instanceof Error && ["CHAT_FORBIDDEN", "CHAT_REQUEST_403", "CHAT_REQUEST_404"].includes(error.message)) {
          if (active) setCall(null);
          return;
        }
      }
      if (active) timer = setTimeout(() => void refresh(), 3000);
    }
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [engine, token, conversationId, id]);
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

export function CallPanel({ call, name, frame, error, controls }: { call: ChatCall; name: string; frame: string; error: string; controls: ReactNode }) {
  const [minimized, setMinimized] = useState(false);
  const [failedFrame, setFailedFrame] = useState("");
  const player = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!frame) return;
    const expectedOrigin = new URL(frame).origin;
    function receive(event: MessageEvent) {
      if (event.origin !== expectedOrigin || event.source !== player.current?.contentWindow) return;
      if (event.data?.type === "mushroom-call:recover") setFailedFrame(frame);
      if (event.data?.type === "mushroom-call:ready") setFailedFrame("");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [frame]);
  const recover = !frame || failedFrame === frame;
  const label = callLabel(call.mode);
  const Icon = call.mode === "AUDIO" ? Phone : Video;
  return <section dir="rtl" aria-label={label} className={minimized
    ? "fixed inset-x-3 top-2 z-[100] mx-auto max-w-lg rounded-2xl border border-border bg-background px-3 shadow-xl"
    : "fixed inset-0 z-[100] flex min-h-0 flex-col bg-background p-3 pt-[max(12px,env(safe-area-inset-top))] text-foreground shadow-xl sm:inset-x-4 sm:inset-y-6 sm:mx-auto sm:max-w-2xl sm:rounded-3xl sm:border sm:border-border"}>
    <header className="flex items-center gap-2">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-primary"><Icon size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><p className="truncate font-bold">{name}</p><p role="status" className="text-xs text-muted-foreground">{label} · {callStatus(call)}</p></div>
      {call.status === "ACTIVE" && <button type="button" aria-label={minimized ? "باز کردن پنل تماس" : "کوچک‌کردن تماس"} onClick={() => setMinimized(!minimized)} className={iconButton}>
        {minimized ? <Maximize2 size={18} aria-hidden="true" /> : <Minimize2 size={18} aria-hidden="true" />}
      </button>}
    </header>
    <div inert={minimized} aria-hidden={minimized} className={minimized ? "absolute size-px overflow-hidden opacity-0" : "flex min-h-0 flex-1 flex-col gap-2 pb-[env(safe-area-inset-bottom)]"}>
      {frame ? <iframe ref={player} title={label} className="mt-2 min-h-0 w-full flex-1 rounded-2xl border-0 bg-muted" src={frame} sandbox="allow-scripts allow-same-origin" allow="camera; microphone; autoplay" referrerPolicy="no-referrer" />
        : <div className="grid flex-1 place-items-center"><div className="grid size-24 place-items-center rounded-full bg-muted text-3xl font-bold text-primary" aria-hidden="true">{name.trim().slice(0, 1) || "م"}</div></div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {(call.status !== "ACTIVE" || recover) && <div className="flex shrink-0 flex-wrap justify-center gap-2">{controls}</div>}
    </div>
  </section>;
}

export function HangUpButton({ onClick, disabled, label = "پایان تماس" }: { onClick: () => void; disabled: boolean; label?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-red-700 px-4 font-semibold text-white disabled:opacity-50"><PhoneOff size={18} aria-hidden="true" />{label}</button>;
}

export function useCallFrame(engine: Engine, token: string, id: string | undefined) {
  const [granted, setGranted] = useState<{ id: string; url: string; version: number } | null>(null);
  const [frameError, setFrameError] = useState("");
  const [version, refresh] = useState(0);
  useEffect(() => {
    setGranted(null);
    setFrameError("");
    if (!id) return;
    let active = true;
    void engine.callGrant(token, id).then(({ url }) => {
      const frameUrl = new URL(url);
      frameUrl.searchParams.set("embedOrigin", window.location.origin);
      if (active) setGranted({ id, url: frameUrl.href, version });
    }).catch(() => {
      if (active) setFrameError("ورود به تماس ممکن نشد. دوباره تلاش کنید.");
    });
    return () => { active = false; };
  }, [engine, token, id, version]);
  return { frame: granted && granted.id === id && granted.version === version ? granted.url : "", frameError, reconnect: () => refresh(previous => previous + 1) };
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

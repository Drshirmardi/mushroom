"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, CalendarDays, ChevronLeft, ChevronDown, Send, CheckCircle2 } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { connectChat, loadChat, loadOlderChat, reconcileChatMessages, chatAccessLabel, type ChatAccess, type ChatConnection, type ChatMessage } from "@/lib/chat-api";

import { listPatientAppointments } from "@/lib/appointment-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { ServicePage, ServiceSection, ServiceEmpty } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { useUiStore } from "@/stores/ui";

type LoadedChat = Awaited<ReturnType<typeof loadChat>>;
type ConnectionState = "loading" | "connected" | "reconnecting" | "offline" | "read-only" | "recovery-failed";

const labels: Record<string, string> = { PATIENT: "شما", DOCTOR: "پزشک", CLINIC_OPERATOR: "کلینیک" };
const dateKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date(value));
const dateLabel = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(value));
const timeLabel = (value: string) => new Intl.DateTimeFormat("fa-IR", { timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));

function ChatAppointments() {
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => listPatientAppointments(authentication.accessToken), [authentication.accessToken]));
  const items = resource.data?.items.filter(item => item.visitMode === "ONLINE" && ["CONFIRMED", "CHECKED_IN", "QUEUED", "IN_PROGRESS", "COMPLETED"].includes(item.status));
  return <ServicePage title="گفتگو با پزشک" description="برای ورود به گفتگو، نوبت مربوط را انتخاب کنید. دسترسی و زمان مجاز گفتگو هنگام ورود بررسی می‌شود." icon={MessageCircle}>
    <p className="service-note">گفتگو به نوبت مشخص شما متصل است. پیام‌ها و وضعیت اتصال پس از ورود نمایش داده می‌شوند.</p>
    <ServiceSection title="انتخاب نوبت برای گفتگو"><PatientResourceState {...resource} retry={() => void resource.reload()} />
      {items?.map(item => <Link key={item.id} href={`/chat?appointmentId=${encodeURIComponent(item.id)}`} className="service-card"><h3>{new Intl.DateTimeFormat("fa-IR", {dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(item.startsAt))}</h3><span className="service-text-action">بررسی و ورود به گفتگو<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}
      {items?.length === 0 && <ServiceEmpty icon={MessageCircle} title="گفتگویی برای ورود ندارید" description="در حال حاضر نوبت جاری یا تأییدشده‌ای برای گفتگو پیدا نشد. نوبت‌های خود را بررسی کنید یا مشاورهٔ جدیدی رزرو کنید." href="/appointments" action="مشاهدهٔ نوبت‌های من" />}
    </ServiceSection>
    <Link href="/appointments/book" className="service-callout"><CalendarDays size={24} aria-hidden="true" /><div><h2>نیاز به مشاوره دارید؟</h2><p>پزشک و زمان مناسب را انتخاب کنید</p></div><ArrowLeft size={18} aria-hidden="true" /></Link>
  </ServicePage>;
}

function ChatRoute() {
  const id = useSearchParams().get("appointmentId");
  return id ? <ChatRoom key={id} appointmentId={id} /> : <ChatAppointments />;
}

export default function ChatPage() { return <Suspense fallback={<p role="status" className="p-4">در حال دریافت گفتگو…</p>}><ChatRoute /></Suspense>; }

function ChatRoom({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const [chat, setChat] = useState<LoadedChat | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [access, setAccess] = useState<ChatAccess | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const transport = useRef<ChatConnection | null>(null);
  const sendLock = useRef(false);
  const pending = useRef<{ conversationId: string; body: string; id: string } | null>(null);
  const room = useRef<HTMLDivElement | null>(null);
  const scroll = useRef<HTMLElement | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const composing = useRef(false);
  const follow = useRef(true);
  const pendingPrepend = useRef<{ conversationId: string; height: number } | null>(null);
  const conversationEpoch = useRef(0);

  // Hide the bottom navigation only while a conversation is open.
  useEffect(() => { useUiStore.getState().setImmersive(true); return () => useUiStore.getState().setImmersive(false); }, []);

  // Keep the room inside the visual viewport while the user's keyboard is open.
  useEffect(() => {
    const element = room.current;
    if (!element) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const apply = () => {
      frame = 0;
      if (!element.isConnected) return;
      const height = viewport?.height ?? window.innerHeight;
      const top = Math.max(0, viewport?.offsetTop ?? 0);
      const nextHeight = `${height}px`;
      const nextTransform = top === 0 ? "" : `translateY(${top}px)`;
      if (element.style.height !== nextHeight) element.style.height = nextHeight;
      if (element.style.transform !== nextTransform) element.style.transform = nextTransform;
      const keyboard = height < window.innerHeight - 120 ? "open" : "closed";
      if (element.dataset.keyboard !== keyboard) element.dataset.keyboard = keyboard;
    };
    const update = () => { if (frame === 0) frame = window.requestAnimationFrame(apply); };
    apply();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      element.style.removeProperty("height");
      element.style.removeProperty("transform");
      element.removeAttribute("data-keyboard");
    };
  }, []);

  useEffect(() => {
    let active = true;
    let handle: ChatConnection | undefined;
    conversationEpoch.current += 1;
    setChat(null); setAccess(null); setError(null); setConnection("loading"); setLoadingOlder(false); pendingPrepend.current = null;
    void loadChat(authentication.accessToken, appointmentId).then((loaded) => {
      if (!active) return;
      follow.current = true; setChat(loaded);
      handle = connectChat(authentication.accessToken, loaded, (message) => {
        if (active) setChat(current => current ? { ...current, messages: reconcileChatMessages(current.messages, message) } : current);
      }, (state, availability) => { if (active) { setConnection(state); if (availability) setAccess(availability); } });
      transport.current = handle;
    }, () => { if (active) { setError("دریافت گفتگو ممکن نشد. دوباره تلاش کنید."); setConnection("recovery-failed"); } });
    return () => { active = false; handle?.disconnect(); if (transport.current === handle) transport.current = null; };
  }, [appointmentId, authentication.accessToken, attempt]);

  useEffect(() => {
    if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [chat?.messages]);

  useLayoutEffect(() => {
    const pending = pendingPrepend.current;
    if (!pending || !chat || chat.conversation.id !== pending.conversationId || !scroll.current) return;
    scroll.current.scrollTop += scroll.current.scrollHeight - pending.height;
    pendingPrepend.current = null;
  }, [chat?.messages, chat?.conversation.id]);

  useEffect(() => { const el = composer.current; if (el && !text) el.style.height = "auto"; }, [text]);

  const send = async () => {
    const handle = transport.current;
    if (!chat || !handle || !text.trim() || connection !== "connected" || sendLock.current) return;
    const draft = text; const body = text.normalize("NFC").trim(); const id = chat.conversation.id;
    if (Array.from(body).length > 4000) { setError("پیام باید حداکثر ۴۰۰۰ نویسه باشد."); return; }
    if (pending.current?.body !== body || pending.current.conversationId !== id) pending.current = { conversationId: id, body, id: crypto.randomUUID() };
    sendLock.current = true; setSending(true); setError(null);
    try {
      const message = await handle.send(body, pending.current.id);
      if (transport.current !== handle) return;
      setChat(current => current?.conversation.id === id ? { ...current, messages: reconcileChatMessages(current.messages, message) } : current);
      setText(current => current === draft ? "" : current); pending.current = null; follow.current = true; setAtBottom(true);
    } catch { if (transport.current === handle) setError("ارسال تأیید نشد؛ متن حفظ شده و می‌توانید دوباره ارسال کنید."); }
    finally { sendLock.current = false; setSending(false); }
  };
  const older = async () => {
    if (!chat?.olderCursor || loadingOlder) return;
    const id = chat.conversation.id; const epoch = conversationEpoch.current;
    setLoadingOlder(true); setError(null); follow.current = false;
    try {
      const page = await loadOlderChat(authentication.accessToken, id, chat.olderCursor);
      if (conversationEpoch.current !== epoch) return;
      const height = scroll.current?.scrollHeight ?? 0;
      pendingPrepend.current = { conversationId: id, height };
      setChat(current => current?.conversation.id === id ? { ...current, messages: page.items.reduce(reconcileChatMessages, current.messages), olderCursor: page.nextCursor ?? null } : current);
    } catch { if (conversationEpoch.current === epoch) setError("دریافت پیام‌های قبلی ممکن نشد."); }
    finally { if (conversationEpoch.current === epoch) setLoadingOlder(false); }
  };

  const jumpToLatest = () => { follow.current = true; setAtBottom(true); if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; };
  const onMessagesScroll = () => {
    const el = scroll.current; if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    follow.current = nearBottom; setAtBottom(nearBottom);
  };
  const grow = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 128)}px`; };
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  };

  const groups = useMemo(() => {
    const result: Array<{ key: string; label: string; items: ChatMessage[] }> = [];
    for (const message of chat?.messages ?? []) {
      const key = dateKey(message.createdAt);
      const last = result.at(-1);
      if (last?.key === key) last.items.push(message);
      else result.push({ key, label: dateLabel(message.createdAt), items: [message] });
    }
    return result;
  }, [chat?.messages]);

  const length = Array.from(text).length;
  const canSend = Boolean(chat) && connection === "connected" && access?.canSend !== false;
  const stateLabel = connection === "connected" ? "متصل" : connection === "reconnecting" ? "در حال اتصال مجدد…" : connection === "offline" ? "آفلاین؛ در حال تلاش مجدد…" : connection === "read-only" ? "فقط‌خواندنی" : connection === "recovery-failed" ? "بازیابی گفتگو ناموفق بود" : "در حال اتصال…";
  const dotTone = connection === "connected" ? "bg-emerald-500" : connection === "recovery-failed" ? "bg-red-500" : connection === "read-only" ? "bg-slate-400" : connection === "loading" ? "bg-slate-300" : "bg-amber-500";
  const readOnlyNote = connection === "read-only" ? chatAccessLabel(access) : null;
  const closedAt = chat?.conversation.closedAt ?? access?.closedAt ?? null;
  const isClosed = closedAt !== null;

  return <div ref={room} className="patient-chat-room group relative z-30 mx-auto flex h-full max-w-[720px] flex-col overflow-hidden bg-[#f6fafc]">
    <header className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2">
      <button type="button" aria-label="بازگشت" onClick={() => router.back()} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><ChevronLeft size={20} aria-hidden="true" /></button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">گفتگوی مشاوره</p>
        <p role="status" className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground"><span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotTone}`} aria-hidden="true" />{stateLabel}</p>
      </div>
      {(connection === "offline" || connection === "recovery-failed" || connection === "read-only") && <button type="button" onClick={() => setAttempt(value => value + 1)} className="flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-primary/5">بررسی دوباره</button>}
    </header>
    {readOnlyNote && !isClosed && <p role="note" className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{readOnlyNote}</p>}
    <div className="relative flex min-h-0 flex-1 flex-col">
      <main ref={scroll} onScroll={onMessagesScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none]">
        {chat?.olderCursor && <button type="button" onClick={() => void older()} disabled={loadingOlder} className="mx-auto mb-2 block rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm ring-1 ring-border disabled:opacity-60">{loadingOlder ? "در حال دریافت…" : "پیام‌های قبلی"}</button>}
        {!chat && !error && <div role="status" className="space-y-2 py-4"><span className="sr-only">در حال دریافت گفتگو…</span>{[0, 1, 2].map(i => <div key={i} className={`h-10 max-w-[70%] animate-pulse rounded-2xl bg-white/80 motion-reduce:animate-none ${i % 2 ? "ms-auto" : ""}`} aria-hidden="true" />)}</div>}
        {error && <p role="alert" className="mx-auto max-w-md rounded-xl bg-red-50 px-3 py-2 text-center text-xs leading-5 text-red-700">{error}</p>}
        {chat?.messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">هنوز پیامی ثبت نشده است. اولین پیام را بفرستید.</p>}
        <div role="log" aria-label="پیام‌های گفتگو" aria-live="polite" className="space-y-2">
          {groups.map(group => <div key={group.key}>
            <div className="my-3 text-center"><span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] text-muted-foreground shadow-sm ring-1 ring-border">{group.label}</span></div>
            <div className="space-y-2">
              {group.items.map(message => {
                const restricted = message.visibility === "RESTRICTED" || message.body === undefined;
                if (restricted) return <p key={message.id} className="mx-auto max-w-[85%] rounded-xl bg-white px-3 py-2 text-center text-[11px] text-muted-foreground ring-1 ring-border">{message.tombstone ?? "محتوای این پیام محدود شده است."}</p>;
                const isOwn = message.senderKind === "PATIENT";
                return <div key={message.id} className={`flex flex-col ${isOwn ? "items-start" : "items-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[clamp(1rem,0.95rem_+_0.35vw,1.125rem)] leading-relaxed shadow-sm sm:max-w-[78%] sm:px-4 sm:py-3 ${isOwn ? "rounded-br-[2px] bg-primary text-primary-foreground" : "rounded-bl-[2px] border border-border bg-white text-foreground"}`}>
                    {!isOwn && <p className="mb-1 text-[11px] font-bold text-muted-foreground sm:text-xs">{labels[message.senderKind]}</p>}
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
                  </div>
                  <time dateTime={message.createdAt} className="mt-1 text-[11px] text-muted-foreground">{timeLabel(message.createdAt)}</time>
                </div>;
              })}
            </div>
          </div>)}
        </div>
      </main>
      {!atBottom && <button type="button" onClick={jumpToLatest} className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-md ring-1 ring-border">رفتن به آخر گفتگو<ChevronDown size={14} aria-hidden="true" /></button>}
    </div>
    {isClosed ? (
      <section role="status" aria-live="polite" aria-atomic="true" className="max-h-[60%] min-h-0 flex-shrink-0 overflow-y-auto overscroll-contain border-t border-border bg-white px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] group-data-[keyboard=open]:pb-3">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-[#f6fafc] p-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" aria-hidden="true"><CheckCircle2 size={18} /></span>
            <div className="min-w-0 text-start">
              <h2 className="text-sm font-bold text-foreground">این ویزیت به پایان رسید</h2>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">گفتگوی این ویزیت توسط پزشک یا کلینیک پایان یافته است و امکان ارسال پیام جدید وجود ندارد. سابقهٔ پیامها همچنان در این صفحه در دسترس شماست.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">بازگشت به صفحهٔ اصلی</Link>
            <Link href="/appointments" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">مشاهدهٔ نوبت‌های من</Link>
          </div>
        </div>
      </section>
    ) : (
      <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex flex-shrink-0 items-end gap-2 border-t border-border bg-white px-3 py-2 pb-[max(10px,env(safe-area-inset-bottom))] group-data-[keyboard=open]:pb-2.5">
        <div className="min-w-0 flex-1">
          <textarea ref={composer} rows={1} aria-label="متن پیام" value={text} onChange={event => { setText(event.target.value); grow(event.currentTarget); }} onKeyDown={onComposerKeyDown} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} disabled={!canSend} maxLength={4000} placeholder={canSend ? "پیام متنی…" : "ارسال پیام در دسترس نیست"} className="block max-h-32 min-h-11 w-full resize-none rounded-2xl bg-muted px-3.5 py-2.5 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60" />
          {length > 0 && <p className={`mt-0.5 text-end text-[10px] ${length > 4000 ? "text-red-600" : "text-muted-foreground"}`}>{length.toLocaleString("fa-IR")} / ۴٬۰۰۰</p>}
        </div>
        <button type="submit" aria-label="ارسال پیام" disabled={!canSend || sending || !text.trim()} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40">{sending ? <span className="text-[10px]">…</span> : <Send size={18} aria-hidden="true" />}</button>
      </form>
    )}
  </div>;
}

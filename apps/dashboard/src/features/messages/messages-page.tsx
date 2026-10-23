"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronLeft, RefreshCw, Send } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { connectChat, loadChat, loadOlderChat, reconcileChatMessages, closeChat, chatAccessLabel, type ChatAccess, type ChatConnection, type ChatMessage } from "@/lib/chat-api";
import { dashboardAppointmentError, type AdminAppointment } from "@/lib/appointment-api";
import { listVisits, visitTime, type Visit } from "@/lib/visits-api";

type LoadedChat = Awaited<ReturnType<typeof loadChat>>;
type Connection = "idle" | "connected" | "reconnecting" | "offline" | "read-only" | "recovery-failed";

const appointmentStatus: Record<AdminAppointment["status"], string> = { PENDING: "در انتظار تأیید", CONFIRMED: "تأییدشده", CHECKED_IN: "پذیرش‌شده", QUEUED: "در صف", IN_PROGRESS: "در حال ویزیت", COMPLETED: "تکمیل‌شده", NO_SHOW: "عدم مراجعه", CANCELLED: "لغوشده" };
const statusTone: Record<AdminAppointment["status"], string> = { PENDING: "bg-amber-50 text-amber-800", CONFIRMED: "bg-blue-50 text-blue-700", CHECKED_IN: "bg-sky-50 text-sky-700", QUEUED: "bg-indigo-50 text-indigo-700", IN_PROGRESS: "bg-emerald-50 text-emerald-700", COMPLETED: "bg-slate-100 text-slate-600", NO_SHOW: "bg-red-50 text-red-700", CANCELLED: "bg-slate-100 text-slate-500" };
const senderLabel: Record<string, string> = { PATIENT: "بیمار", DOCTOR: "پزشک", CLINIC_OPERATOR: "کلینیک" };
const dateKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date(value));
const dateLabel = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(value));
const timeLabel = (value: string) => new Intl.DateTimeFormat("fa-IR", { timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));

export function MessagesPage({ visitId, embedded = false }: { visitId?: string; embedded?: boolean } = {}) {
  const { authentication } = useDashboardSession();
  const [openedId, setOpenedId] = useState(visitId ?? "");
  const [mobileView, setMobileView] = useState<"list" | "thread">(visitId ? "thread" : "list");
  const [attempt, setAttempt] = useState(0);
  const [appointments, setAppointments] = useState<Visit[] | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [chat, setChat] = useState<LoadedChat | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("idle");
  const [access, setAccess] = useState<ChatAccess | null>(null);
  const [confirmingCloseId, setConfirmingCloseId] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const transport = useRef<ChatConnection | null>(null);
  const sendLock = useRef(false);
  const pending = useRef<{ conversationId: string; body: string; id: string } | null>(null);
  const scroll = useRef<HTMLDivElement | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const composing = useRef(false);
  const follow = useRef(true);
  const listGeneration = useRef(0);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [listTotal, setListTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const pendingPrepend = useRef<{ conversationId: string; height: number } | null>(null);
  const activeConversation = useRef<string | null>(null);
  const conversationEpoch = useRef(0);
  const canAccessChat = authentication.user.roles.includes("ADMIN") || authentication.user.roles.includes("DOCTOR");

  const loadAppointments = useCallback((page = 1, append = false) => {
    const generation = ++listGeneration.current;
    if (append) setLoadingMore(true);
    else { setAppointments(null); setListTotal(null); setListPage(1); }
    setAppointmentsError(null);
    void listVisits(authentication.accessToken, !authentication.user.roles.includes("ADMIN"), { page }).then(result => {
      if (generation !== listGeneration.current) return;
      const available = result.items.filter(appointment => appointment.visitMode === "ONLINE" && appointment.status !== "CANCELLED" && appointment.status !== "NO_SHOW");
      setAppointments(current => {
        if (!append || !current) return available;
        const merged = new Map(current.map(item => [item.id, item]));
        for (const item of available) merged.set(item.id, item);
        return Array.from(merged.values());
      });
      setListPage(result.page); setListPageSize(result.pageSize); setListTotal(result.total);
    }, reason => { if (generation === listGeneration.current) setAppointmentsError(dashboardAppointmentError(reason)); })
      .finally(() => { if (generation === listGeneration.current) setLoadingMore(false); });
  }, [authentication.accessToken, authentication.user.roles]);
  useEffect(() => {
    queueMicrotask(() => { setText(""); pending.current = null; setConfirmingCloseId(null); });
  }, [openedId]);
  useEffect(() => {
    if (!canAccessChat || visitId) return;
    queueMicrotask(loadAppointments);
    return () => { listGeneration.current++; };
  }, [loadAppointments, canAccessChat, visitId]);

  useEffect(() => {
    if (!openedId || !canAccessChat) return;
    let active = true; let handle: ChatConnection | undefined;
    queueMicrotask(() => {
      if (!active) return;
      conversationEpoch.current += 1;
      setChat(null); setAccess(null); setError(null); setConnection("idle"); setLoadingOlder(false); pendingPrepend.current = null;
      void loadChat(authentication.accessToken, openedId).then(loaded => {
        if (!active) return;
        setChat(loaded); follow.current = true; setAtBottom(true); activeConversation.current = loaded.conversation.id;
        handle = connectChat(authentication.accessToken, loaded, message => {
          if (active) setChat(current => current ? { ...current, messages: reconcileChatMessages(current.messages, message) } : current);
        }, (state, availability) => { if (active) { setConnection(state); if (availability) setAccess(availability); } });
        transport.current = handle;
      }, () => { if (active) { setError("دریافت این گفتگو ممکن نشد. دسترسی و اتصال را بررسی کنید."); setConnection("recovery-failed"); } });
    });
    return () => { active = false; handle?.disconnect(); if (transport.current === handle) transport.current = null; activeConversation.current = null; };
  }, [authentication.accessToken, openedId, attempt, canAccessChat]);
  useEffect(() => { if (follow.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [chat?.messages]);
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
      if (activeConversation.current !== id || conversationEpoch.current !== epoch) return;
      const height = scroll.current?.scrollHeight ?? 0;
      pendingPrepend.current = { conversationId: id, height };
      setChat(current => current?.conversation.id === id ? { ...current, messages: page.items.reduce(reconcileChatMessages, current.messages), olderCursor: page.nextCursor ?? null } : current);
    } catch { if (activeConversation.current === id && conversationEpoch.current === epoch) setError("دریافت پیام‌های قبلی ممکن نشد."); }
    finally { if (activeConversation.current === id && conversationEpoch.current === epoch) setLoadingOlder(false); }
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

  if (!canAccessChat) return <div className="flex-1 p-7"><h1 className="text-xl font-bold">پیام‌ها</h1><p role="alert" className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">دسترسی کارکنان به گفتگوهای درمانی فعال نیست.</p></div>;
  const title = authentication.user.roles.includes("ADMIN") ? "کلینیک / اپراتور" : "پزشک تخصیص‌یافته";
  const state = connection === "connected" ? "متصل" : connection === "reconnecting" ? "در حال اتصال مجدد…" : connection === "offline" ? "آفلاین؛ در حال تلاش مجدد…" : connection === "read-only" ? "فقط‌خواندنی" : connection === "recovery-failed" ? "بازیابی گفتگو ناموفق بود" : openedId ? "در حال دریافت گفتگو…" : "یک گفتگو را انتخاب کنید";
  const canSend = Boolean(chat) && connection === "connected" && access?.canSend !== false;
  const length = Array.from(text).length;
  const selectedVisit = appointments?.find(visit => visit.id === openedId) ?? null;
  const showList = !embedded && !visitId;
  const dotTone = connection === "connected" ? "bg-emerald-500" : connection === "recovery-failed" ? "bg-red-500" : connection === "read-only" ? "bg-slate-400" : connection === "idle" ? "bg-slate-300" : "bg-amber-500";
  const close = async () => {
    const targetId = confirmingCloseId;
    if (!targetId || closing !== null) return;
    if (!chat || chat.conversation.id !== targetId) { setConfirmingCloseId(null); return; }
    const epoch = conversationEpoch.current;
    setClosing(targetId); setError(null);
    try {
      await closeChat(authentication.accessToken, targetId);
      if (activeConversation.current !== targetId || conversationEpoch.current !== epoch) return;
      setConfirmingCloseId(null);
      setAttempt(value => value + 1);
    } catch {
      if (activeConversation.current === targetId && conversationEpoch.current === epoch) setError("بستن گفتگو انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setClosing(current => current === targetId ? null : current);
    }
  };

  return <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${embedded ? "h-[70dvh] min-h-[480px] max-h-[800px] p-3" : "p-4 sm:p-7"}`}>
    {!embedded && <header className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h1 className="text-xl font-bold">گفتگوهای درمانی</h1><p className="mt-1 text-sm text-muted-foreground">هویت ارسال: {title}</p></div></header>}
    {!embedded && appointmentsError && <p role="alert" className="mb-3 flex items-center gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{appointmentsError}<button type="button" onClick={() => loadAppointments()} className="inline-flex items-center gap-1 font-bold"><RefreshCw size={14} />تلاش دوباره</button></p>}
    <div className={showList ? "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]" : "flex min-h-0 flex-1 flex-col"}>
      {showList && <aside className={`min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card ${mobileView === "thread" ? "hidden lg:flex" : "flex"}`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="text-sm font-bold">گفتگوها با بیماران</h2>{appointments && <span className="text-xs text-muted-foreground">{appointments.length.toLocaleString("fa-IR")}</span>}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {appointments === null ? (appointmentsError ? null : <p role="status" className="p-4 text-sm text-muted-foreground">در حال دریافت نوبت‌ها…</p>)
            : appointments.length === 0 && !(listTotal !== null && listPage * listPageSize < listTotal) ? <p className="p-4 text-sm text-muted-foreground">گفتگوی فعالی برای شما وجود ندارد.</p>
              : appointments.map(visit => <button key={visit.id} type="button" onClick={() => { setOpenedId(visit.id); setMobileView("thread"); }} aria-current={openedId === visit.id ? "true" : undefined} className={`flex w-full flex-col items-start gap-1 border-b border-border px-4 py-3 text-right transition-colors last:border-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176b9a] ${openedId === visit.id ? "bg-[#176b9a]/5" : "hover:bg-slate-100"}`}>
                <span className="flex w-full items-center justify-between gap-2"><span className="truncate text-sm font-bold">{visit.patientDisplayName ?? "بیمار"}</span><span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone[visit.status]}`}>{appointmentStatus[visit.status]}</span></span>
                <span className="truncate text-xs text-muted-foreground">{visitTime(visit.startsAt)}{visit.serviceName ? ` · ${visit.serviceName}` : ""}</span>
              </button>)}
          {appointments && listTotal !== null && listPage * listPageSize < listTotal && <button type="button" disabled={loadingMore} onClick={() => loadAppointments(listPage + 1, true)} className="w-full border-t border-border py-3 text-xs font-bold text-[#176b9a] disabled:opacity-60">{loadingMore ? "در حال دریافت…" : "نمایش بیشتر"}</button>}
        </div>
      </aside>}
      <section className={`min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card ${showList && mobileView === "list" ? "hidden lg:flex" : "flex"}`}>
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          {showList && <button type="button" onClick={() => setMobileView("list")} aria-label="بازگشت به فهرست" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 lg:hidden"><ChevronLeft size={18} aria-hidden="true" /></button>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{(!embedded && selectedVisit?.patientDisplayName) || "گفتگو"}</p>
            <p role="status" className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground"><span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotTone}`} aria-hidden="true" />{connection === "read-only" ? chatAccessLabel(access) ?? state : state}</p>
          </div>
          {access?.canClose && <button type="button" onClick={() => { if (chat) setConfirmingCloseId(chat.conversation.id); }} className="min-h-9 flex-shrink-0 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-700">بستن کامل گفتگو</button>}
        </div>
        {confirmingCloseId !== null && <div role="alert" className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p>با بستن گفتگو، ارسال پیام برای طرفین پایان می‌یابد. سابقهٔ پیام‌ها باقی می‌ماند.</p><div className="mt-3 flex gap-2"><button type="button" disabled={closing === confirmingCloseId} onClick={() => void close()} className="min-h-11 rounded-xl bg-red-700 px-4 font-bold text-white">{closing === confirmingCloseId ? "در حال بستن…" : "بستن گفتگو"}</button><button type="button" disabled={closing === confirmingCloseId} onClick={() => setConfirmingCloseId(null)} className="min-h-11 px-4">ادامهٔ گفتگو</button></div></div>}
        {error && <p role="alert" className="mx-4 mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {(connection === "offline" || connection === "recovery-failed" || connection === "read-only") && <button type="button" onClick={() => setAttempt(value => value + 1)} className="mx-4 mt-2 self-start text-xs font-bold text-[#176b9a]">بررسی دوباره اتصال و امکان ارسال</button>}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={scroll} onScroll={onMessagesScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 [overflow-anchor:none]">
            {chat?.olderCursor && <button type="button" onClick={() => void older()} disabled={loadingOlder} className="mx-auto block rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-[#176b9a] disabled:opacity-60">{loadingOlder ? "در حال دریافت…" : "پیام‌های قبلی"}</button>}
            {!chat && !error && <p className="p-4 text-sm text-muted-foreground">{openedId ? "در حال دریافت گفتگو…" : "برای مشاهده پیام‌ها یک گفتگو را انتخاب کنید."}</p>}
            {chat?.messages.length === 0 && <p className="p-4 text-sm text-muted-foreground">هنوز پیامی ثبت نشده است.</p>}
            <div role="log" aria-label="پیام‌های گفتگو" aria-live="polite" className="space-y-2">
              {groups.map(group => <div key={group.key}>
                <div className="my-3 text-center"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-muted-foreground">{group.label}</span></div>
                <div className="space-y-2">
                  {group.items.map(message => {
                    const restricted = message.visibility === "RESTRICTED" || message.body === undefined;
                    if (restricted) return <p key={message.id} className="mx-auto max-w-[85%] rounded-xl bg-slate-100 px-3 py-2 text-center text-[11px] text-muted-foreground">{message.tombstone ?? "محتوای این پیام محدود شده است."}</p>;
                    const isOwn = message.senderKind !== "PATIENT";
                    return <div key={message.id} className={`flex flex-col ${isOwn ? "items-start" : "items-end"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isOwn ? "rounded-br-md bg-[#176b9a] text-white" : "rounded-bl-md border border-border bg-white text-foreground"}`}>
                        <p className={`mb-0.5 text-[11px] font-bold ${isOwn ? "text-white/80" : "text-muted-foreground"}`}>{senderLabel[message.senderKind]}</p>
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
                      </div>
                      <time dateTime={message.createdAt} className="mt-1 text-[10px] text-muted-foreground">{timeLabel(message.createdAt)}</time>
                    </div>;
                  })}
                </div>
              </div>)}
            </div>
          </div>
          {!atBottom && <button type="button" onClick={jumpToLatest} className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#176b9a] shadow-md ring-1 ring-border">رفتن به آخر گفتگو<ChevronDown size={14} aria-hidden="true" /></button>}
        </div>
        <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex flex-shrink-0 items-end gap-2 border-t border-border p-3">
          <div className="min-w-0 flex-1">
            <textarea ref={composer} rows={1} aria-label="متن پیام" value={text} onChange={event => { setText(event.target.value); grow(event.currentTarget); }} onKeyDown={onComposerKeyDown} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} disabled={!canSend} maxLength={4000} placeholder={canSend ? "پیام متنی…" : "ارسال پیام در دسترس نیست"} className="block max-h-32 min-h-11 w-full resize-none rounded-xl bg-slate-100 px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#176b9a]/30 disabled:opacity-60" />
            {length > 0 && <p className={`mt-0.5 text-end text-[10px] ${length > 4000 ? "text-red-600" : "text-muted-foreground"}`}>{length.toLocaleString("fa-IR")} / ۴٬۰۰۰</p>}
          </div>
          <button type="submit" aria-label="ارسال پیام" disabled={!canSend || sending || !text.trim()} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#176b9a] text-white disabled:opacity-40">{sending ? <span className="text-[10px]">…</span> : <Send size={18} aria-hidden="true" />}</button>
        </form>
      </section>
    </div>
  </div>;
}

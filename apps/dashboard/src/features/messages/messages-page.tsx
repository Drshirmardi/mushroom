"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { connectChat, loadChat, reconcileChatMessages, sendChat } from "@/lib/chat-api";

type LoadedChat = Awaited<ReturnType<typeof loadChat>>;
type Connection = "idle" | "connected" | "reconnecting" | "offline" | "read-only" | "recovery-failed";

export function MessagesPage() {
  const { authentication } = useDashboardSession();
  const [appointmentId, setAppointmentId] = useState("");
  const [chat, setChat] = useState<LoadedChat | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("idle");
  const lastSequence = useRef("0");
  const canAccessChat = authentication.user.roles.includes("ADMIN") || authentication.user.roles.includes("DOCTOR");

  useEffect(() => {
    if (!chat) return;
    lastSequence.current = chat.messages.at(-1)?.sequence ?? "0";
    const socket = connectChat(authentication.accessToken, chat.conversation.id, () => lastSequence.current, (message) => setChat((current) => { if (!current) return current; const messages = reconcileChatMessages(current.messages, message); lastSequence.current = messages.at(-1)?.sequence ?? lastSequence.current; return { ...current, messages }; }), setConnection);
    const heartbeat = window.setInterval(() => socket.emit("presence:heartbeat", { conversationId: chat.conversation.id, lastSequence: lastSequence.current }), 15_000);
    return () => { window.clearInterval(heartbeat); socket.disconnect(); };
  }, [authentication.accessToken, chat?.conversation.id]);

  if (!canAccessChat) return <div className="flex-1 p-7"><h1 className="text-xl font-bold">پیام‌ها</h1><p role="alert" className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">دسترسی کارکنان به گفتگوهای درمانی در MVP فعال نیست.</p></div>;

  const open = async () => {
    setError(null); setChat(null); setConnection("idle");
    try { const loaded = await loadChat(authentication.accessToken, appointmentId.trim()); lastSequence.current = loaded.messages.at(-1)?.sequence ?? "0"; setChat(loaded); }
    catch { setError("این گفتگوی نوبت برای حساب یا کلینیک فعال شما در دسترس نیست."); }
  };
  const send = async () => {
    if (!chat || !text.trim() || connection !== "connected") return;
    try { const message = await sendChat(authentication.accessToken, chat.conversation.id, text.trim()); const messages = reconcileChatMessages(chat.messages, message); lastSequence.current = messages.at(-1)?.sequence ?? lastSequence.current; setChat({ ...chat, messages }); setText(""); }
    catch { setError("ارسال پیام در وضعیت فعلی نوبت مجاز نیست."); setConnection("read-only"); }
  };
  const title = authentication.user.roles.includes("ADMIN") ? "کلینیک / اپراتور" : "پزشک تخصیص‌یافته";
  const state = connection === "connected" ? "متصل" : connection === "reconnecting" ? "در حال اتصال مجدد…" : connection === "offline" ? "آفلاین؛ در حال تلاش مجدد…" : connection === "read-only" ? "فقط‌خواندنی" : connection === "recovery-failed" ? "بازیابی گفتگو ناموفق بود" : "یک نوبت را انتخاب کنید";
  const canSend = Boolean(chat) && connection === "connected";

  return <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-7"><div><h1 className="text-xl font-bold">گفتگوهای درمانی</h1><p className="mt-1 text-sm text-muted-foreground">هویت ارسال: {title} · {state}</p></div><div className="mt-5 flex max-w-2xl gap-2"><input value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)} placeholder="شناسه نوبت آنلاین" className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"/><button disabled={!appointmentId.trim()} onClick={() => void open()} className="rounded-xl bg-primary px-4 text-sm text-white">باز کردن گفتگو</button></div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<section className="mt-5 flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card"><div className="flex-1 space-y-3 overflow-y-auto p-5">{chat?.messages.length === 0 && <p className="text-sm text-muted-foreground">هنوز پیامی ثبت نشده است.</p>}{chat?.messages.map((message) => <article key={message.id} className="max-w-xl rounded-2xl border border-border p-3 text-sm"><p>{message.body ?? message.tombstone ?? "محتوای این پیام بر اساس سیاست گفتگو محدود شده است."}</p><small className="text-muted-foreground">{message.createdAt}</small></article>)}</div><div className="flex gap-2 border-t border-border p-4"><input value={text} onChange={(event) => setText(event.target.value)} disabled={!canSend} maxLength={4000} placeholder={canSend ? "پیام متنی…" : "ارسال پیام در دسترس نیست"} className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm"/><button aria-label="ارسال پیام" disabled={!canSend || !text.trim()} onClick={() => void send()} className="rounded-xl bg-primary px-3 text-white"><Send size={16}/></button></div></section></div>;
}

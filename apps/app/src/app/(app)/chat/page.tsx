"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { connectChat, loadChat, reconcileChatMessages, sendChat, type ChatMessage } from "@/lib/chat-api";

type LoadedChat = Awaited<ReturnType<typeof loadChat>>;
type ConnectionState = "loading" | "connected" | "reconnecting" | "offline" | "read-only";

export default function ChatPage() {
  const router = useRouter();
  const appointmentId = useSearchParams().get("appointmentId");
  const { authentication } = useAuthSession();
  const [chat, setChat] = useState<LoadedChat | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const lastSequence = useRef("0");

  useEffect(() => {
    if (!appointmentId) { setError("نوبت گفتگو مشخص نیست."); return; }
    let active = true;
    let disconnect = () => undefined;
    setChat(null); setError(null); setConnection("loading");
    void loadChat(authentication.accessToken, appointmentId).then((loaded) => {
      if (!active) return;
      lastSequence.current = loaded.messages.at(-1)?.sequence ?? "0";
      setChat(loaded);
      const socket = connectChat(authentication.accessToken, loaded.conversation.id, () => lastSequence.current, (message) => {
        if (active) setChat((current) => { if (!current) return current; const messages = reconcileChatMessages(current.messages, message); lastSequence.current = messages.at(-1)?.sequence ?? lastSequence.current; return { ...current, messages }; });
      }, (state) => { if (active) setConnection(state); });
      const heartbeat = window.setInterval(() => socket.emit("presence:heartbeat", { conversationId: loaded.conversation.id, lastSequence: lastSequence.current }), 15_000);
      disconnect = () => { window.clearInterval(heartbeat); socket.disconnect(); };
    }, () => { if (active) { setError("گفتگو در دسترس نیست."); setConnection("read-only"); } });
    return () => { active = false; disconnect(); };
  }, [appointmentId, authentication.accessToken]);

  const send = async () => {
    if (!chat || !text.trim() || connection === "read-only") return;
    try {
      const message = await sendChat(authentication.accessToken, chat.conversation.id, text.trim());
      const messages = reconcileChatMessages(chat.messages, message); lastSequence.current = messages.at(-1)?.sequence ?? lastSequence.current; setChat({ ...chat, messages }); setText("");
    } catch { setError("ارسال پیام ممکن نیست؛ گفتگو فقط‌خواندنی است یا اتصال را دوباره بررسی کنید."); setConnection("read-only"); }
  };
  const canSend = Boolean(chat) && connection === "connected";
  const stateLabel = connection === "connected" ? "متصل" : connection === "reconnecting" ? "در حال اتصال مجدد…" : connection === "offline" ? "آفلاین؛ در حال تلاش مجدد…" : connection === "read-only" ? "فقط‌خواندنی" : "در حال اتصال…";

  return <div className="flex flex-col" style={{ height: "calc(100vh - 100px)" }}>
    <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3"><button aria-label="بازگشت" onClick={() => router.back()} className="rounded-xl bg-muted p-2"><ChevronLeft size={20} /></button><div><p className="text-sm font-bold">گفتگوی مشاوره</p><p className="text-xs text-muted-foreground">{stateLabel} · فقط پیام متنی در نوبت معتبر</p></div></header>
    <main className="flex-1 space-y-3 overflow-y-auto bg-[#f5f8f5] p-4">{!chat && !error && <p role="status">در حال دریافت گفتگو…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{chat?.messages.length === 0 && <p className="text-sm text-muted-foreground">هنوز پیامی ثبت نشده است.</p>}{chat?.messages.map((message) => <article key={message.id} className="rounded-2xl border border-border bg-white p-3 text-sm"><p>{message.body ?? message.tombstone ?? "محتوای این پیام بر اساس سیاست گفتگو محدود شده است."}</p><small className="text-muted-foreground">{message.createdAt}</small></article>)}</main>
    <footer className="flex gap-2 border-t border-border bg-white p-3"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} disabled={!canSend} placeholder={canSend ? "پیام متنی…" : "ارسال پیام در دسترس نیست"} className="flex-1 rounded-xl bg-muted px-3"/><button aria-label="ارسال پیام" disabled={!canSend || !text.trim()} onClick={() => void send()} className="rounded-xl bg-primary p-3 text-white"><Send size={16}/></button></footer>
  </div>;
}

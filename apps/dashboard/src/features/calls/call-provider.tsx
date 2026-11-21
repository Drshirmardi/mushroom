"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import type { components } from "@sabz-zendegi/api-client";
import { CallPanel, HangUpButton, callIconButton, callLive, useCallFrame, useCallTab } from "@sabz-zendegi/api-client/chat-ui";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { chatEngine } from "@/lib/chat-api";

type Call = components["schemas"]["OutgoingCallDto"];
type Target = { appointmentId: string; patientId?: string; participantName: string; mode: Call["mode"] };
const Calls = createContext<{
  start: (target: Target) => void;
  beforeLogout: () => Promise<void>;
  available: boolean;
  busy: boolean;
  error: string;
} | null>(null);

export function useDashboardCall() {
  const value = useContext(Calls);
  if (!value) throw new Error("CallProvider is missing");
  return value;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { authentication } = useDashboardSession();
  const token = authentication.accessToken;
  let sid = "";
  try { sid = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))).sid ?? ""; } catch {}
  const session = authentication.user.id + ":" + sid;
  return <SessionCalls key={session} token={token} session={session}>{children}</SessionCalls>;
}

function SessionCalls({ children, token, session }: { children: ReactNode; token: string; session: string }) {
  const [call, setCall] = useState<Call | null>(null);
  const [target, setTarget] = useState<Target>();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const currentToken = useRef(token);
  const action = useRef(false);
  const channel = useRef<BroadcastChannel>(null);
  const stream = useRef<ReturnType<typeof chatEngine.watchOutgoing>>(null);
  const { owner, transfer } = useCallTab(session);
  const active = call?.status === "ACTIVE";
  const { frame, frameError, joining, reconnect } = useCallFrame(chatEngine, token, active && owner ? call.id : undefined);

  useEffect(() => { currentToken.current = token; stream.current?.renew(); }, [token]);
  useEffect(() => {
    let mounted = true;
    void chatEngine.video(currentToken.current).then(result => { if (mounted) setAvailable(result.available); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const connection = new BroadcastChannel("mushroom-outgoing:" + session);
    channel.current = connection;
    connection.onmessage = event => {
      if (event.data?.type === "snapshot" && !owner && !action.current) setCall(event.data.call);
    };
    return () => { channel.current = null; connection.close(); };
  }, [owner, session]);
  useEffect(() => {
    if (!available) return;
    if (!owner) {
      let mounted = true;
      void chatEngine.outgoing(currentToken.current).then(result => {
        if (mounted && !action.current) setCall(result.call);
      }).catch(() => {});
      return () => { mounted = false; };
    }
    const source = chatEngine.watchOutgoing(() => currentToken.current, next => {
      if (!action.current) setCall(next);
      channel.current?.postMessage({ type: "snapshot", call: next });
    });
    stream.current = source;
    return () => { stream.current = null; source.disconnect(); };
  }, [available, owner]);
  useEffect(() => {
    if (!active || !owner) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active, owner]);
  useEffect(() => {
    if (target) dialog.current?.showModal();
    else dialog.current?.close();
  }, [target]);

  function update(next: Call | null) {
    setCall(next);
    channel.current?.postMessage({ type: "snapshot", call: next });
  }
  async function change(next?: Target, switching = false) {
    if (action.current) return;
    action.current = true;
    setBusy(true);
    setError("");
    try {
      if (call && callLive(call) && (switching || !next)) {
        const ended = await chatEngine.callAction(currentToken.current, call.id, "end", switching ? "switched" : undefined)
          .catch(async () => chatEngine.call(currentToken.current, call.id));
        if (ended.status !== "ENDED" && ended.status !== "CANCELLED" && ended.status !== "DECLINED" && ended.status !== "MISSED" && ended.status !== "FAILED") {
          throw new Error("CALL_END_UNCONFIRMED");
        }
        update(null);
      }
      if (next) {
        const started = await chatEngine.startCall(currentToken.current, next.appointmentId, next.mode);
        update({ ...started, patientId: next.patientId ?? null, patientName: next.participantName, conversationId: null });
        if (!owner) transfer();
        setExpanded(value => value + 1);
      }
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : "";
      setError(code === "CHAT_PATIENT_OFFLINE" ? "بیمار در برنامه آنلاین نیست."
        : code === "CALL_END_UNCONFIRMED" ? "پایان تماس فعلی تأیید نشد."
          : "درخواست تماس انجام نشد. دوباره تلاش کنید.");
      if (code === "CHAT_CALL_ALREADY_ACTIVE") {
        void chatEngine.outgoing(currentToken.current).then(result => update(result.call)).catch(() => {});
      }
    } finally {
      action.current = false;
      setBusy(false);
    }
  }

  function start(next: Target) {
    if (call && callLive(call)) {
      if (call.appointmentId === next.appointmentId || next.patientId && call.patientId === next.patientId) {
        if (!owner) transfer();
        setExpanded(value => value + 1);
      } else setTarget(next);
      return;
    }
    void change(next);
  }

  async function beforeLogout() {
    if (!call || !callLive(call)) return;
    const ending = chatEngine.endBeforeLogout(currentToken.current, call.id).catch(() => {});
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([ending, new Promise<void>(resolve => { timeout = setTimeout(resolve, 3000); })]);
    clearTimeout(timeout);
  }

  const name = call?.patientName || "بیمار";
  const end = <HangUpButton disabled={busy} onClick={() => void change()} label={active ? "پایان تماس" : "لغو تماس"} />;
  return <Calls.Provider value={{ start, beforeLogout, available, busy, error }}>
    {children}
    {call && callLive(call) && typeof document !== "undefined" && createPortal(owner
      ? <CallPanel key={call.id} floating expandRequest={expanded} call={call} name={name} frame={frame}
          error={error || frameError} endControl={end} joining={joining} recover={media => reconnect(media, true)} controls={<>
            {active && <button type="button" aria-label="تلاش مجدد" title="تلاش مجدد" className={callIconButton} onClick={() => reconnect()}><RotateCw size={20} /></button>}
            {end}
          </>} returnLink={<Link href={"/appointments/" + call.appointmentId} className="self-center whitespace-nowrap px-1 text-xs">بازگشت به بیمار</Link>} />
      : <aside dir="rtl" className="fixed bottom-3 left-3 z-[1000] rounded-xl border bg-card p-3 shadow-lg">
          <p>تماس با {name} در تب دیگری فعال است.</p>
          <button type="button" className="min-h-11 font-bold" onClick={transfer}>انتقال به این تب</button>
        </aside>, document.body)}
    <dialog ref={dialog} onCancel={() => setTarget(undefined)} className="m-auto w-[min(90vw,420px)] rounded-2xl bg-card p-5 text-foreground shadow-xl backdrop:bg-black/40" dir="rtl">
      <h2 className="font-bold">{active ? `با ${name} در تماس هستید` : `تماس با ${name} هنوز در حال زنگ خوردن است`}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" autoFocus className="min-h-11 rounded-xl bg-primary px-3 text-primary-foreground" onClick={() => { setTarget(undefined); setExpanded(value => value + 1); }}>برگشت به تماس فعلی</button>
        <button type="button" className="min-h-11 rounded-xl border border-red-500 px-3 text-red-700" onClick={() => { if (target) void change(target, true); setTarget(undefined); }}>{active ? "پایان و تماس با بیمار جدید" : "لغو تماس فعلی و تماس با بیمار جدید"}</button>
      </div>
    </dialog>
  </Calls.Provider>;
}

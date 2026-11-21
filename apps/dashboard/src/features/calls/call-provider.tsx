"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import type { components } from "@sabz-zendegi/api-client";
import { CallPanel, HangUpButton, callIconButton, callLive, useCallEndFeedback, useCallFrame, useCallTab } from "@sabz-zendegi/api-client/chat-ui";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { chatEngine } from "@/lib/chat-api";

type Call = components["schemas"]["OutgoingCallDto"];
type Target = { appointmentId: string; patientId?: string; participantName: string; mode: Call["mode"] };
const videoRetryDelays = [1000, 2000, 5000, 10000, 20000, 30000];
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
  const latest = useRef<{ call: Call | null }>(undefined);
  const refreshId = useRef(0);
  const endedCalls = useRef(new Set<string>());
  const stream = useRef<ReturnType<typeof chatEngine.watchOutgoing>>(null);
  const { owner, transfer } = useCallTab(session, call?.id);
  const finished = useCallEndFeedback(call, owner);
  const [disconnectedId, setDisconnectedId] = useState<string>();
  const active = call?.status === "ACTIVE";
  const disconnecting = active && disconnectedId === call.id;
  const { frame, frameError, joining, reconnect } = useCallFrame(chatEngine, token, active && owner && !disconnecting ? call.id : undefined, true);

  useEffect(() => { currentToken.current = token; stream.current?.renew(); }, [token]);
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    let inFlight = false;
    async function check() {
      clearTimeout(timer);
      if (!mounted || inFlight) return;
      inFlight = true;
      try {
        const result = await chatEngine.video(currentToken.current);
        if (mounted) setAvailable(result.available);
        failures = 0;
      } catch {
        if (mounted) timer = setTimeout(check, videoRetryDelays[Math.min(failures++, videoRetryDelays.length - 1)]);
      } finally { inFlight = false; }
    }
    void check();
    window.addEventListener("online", check);
    return () => {
      mounted = false;
      clearTimeout(timer);
      window.removeEventListener("online", check);
    };
  }, []);

  function apply(next: Call | null) {
    if (next && callLive(next) && endedCalls.current.has(next.id)) return;
    setCall(previous => {
      if (previous && next && previous.id !== next.id && callLive(previous) && !callLive(next)) return previous;
      if (!previous || next?.id !== previous.id) return next;
      if (previous.status === "ACTIVE" && next.status === "RINGING") return previous;
      return previous.connectedAt && !next.connectedAt ? { ...next, connectedAt: previous.connectedAt } : next;
    });
  }

  function recordEnd(id: string) {
    endedCalls.current.add(id);
    if (endedCalls.current.size > 128) endedCalls.current.delete(endedCalls.current.values().next().value!);
  }

  async function reconcile() {
    const request = ++refreshId.current;
    const before = latest.current;
    try {
      const { call: snapshot } = await chatEngine.outgoing(currentToken.current);
      if (request === refreshId.current) {
        apply(before !== latest.current && latest.current ? latest.current.call : snapshot);
      }
    } catch {
      if (request === refreshId.current && latest.current?.call) apply(latest.current.call);
    }
  }

  useEffect(() => {
    if (!available) return;
    const stop = new AbortController();
    const channel = navigator.locks && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("mushroom-outgoing:" + session) : undefined;
    function receive(next: Call | null) {
      if (stop.signal.aborted) return;
      if (next) {
        if (callLive(next) && endedCalls.current.has(next.id)) return;
        if (!callLive(next)) recordEnd(next.id);
      }
      latest.current = { call: next };
      if (!action.current) apply(next);
    }
    function watch() {
      stream.current = chatEngine.watchOutgoing(() => currentToken.current, next => {
        receive(next);
        channel?.postMessage({ call: next });
      });
    }
    if (channel) {
      channel.onmessage = ({ data }) => receive(data.call);
      let leading = false;
      void navigator.locks.request("mushroom-outgoing:" + session, { signal: stop.signal }, async () => {
        if (stop.signal.aborted) return;
        leading = true;
        watch();
        await new Promise<void>(resolve => stop.signal.addEventListener("abort", () => resolve(), { once: true }));
      }).catch(() => {});
      // A background tab can load the active call even before the leader broadcasts an update.
      const initial = setTimeout(() => {
        if (!leading && !action.current && latest.current === undefined) void reconcile();
      }, 250);
      stop.signal.addEventListener("abort", () => clearTimeout(initial), { once: true });
    } else watch();
    return () => {
      refreshId.current++;
      stop.abort();
      stream.current?.disconnect();
      stream.current = null;
      channel?.close();
    };
  }, [available, session]);
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

  async function change(next?: Target, switching = false) {
    if (action.current) return;
    action.current = true;
    refreshId.current++;
    latest.current = undefined;
    setBusy(true);
    setError("");
    try {
      if (call && callLive(call) && (switching || !next)) {
        if (call.status === "ACTIVE") setDisconnectedId(call.id);
        const ended = await chatEngine.callAction(currentToken.current, call.id, "end", switching ? "switched" : undefined)
          .catch(async () => chatEngine.call(currentToken.current, call.id));
        if (ended.status !== "ENDED" && ended.status !== "CANCELLED" && ended.status !== "DECLINED" && ended.status !== "MISSED" && ended.status !== "FAILED") {
          throw new Error("CALL_END_UNCONFIRMED");
        }
        recordEnd(call.id);
        apply(null);
      }
      if (next) {
        const started = await chatEngine.startCall(currentToken.current, next.appointmentId, next.mode);
        if (callLive(started)) {
          transfer(started.id);
          apply({ ...started, patientId: next.patientId ?? null, patientName: next.participantName, conversationId: null });
          setExpanded(value => value + 1);
        }
      }
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : "";
      setError(code === "CHAT_PATIENT_OFFLINE" ? "بیمار در برنامه آنلاین نیست."
        : code === "CALL_END_UNCONFIRMED" || !next ? "پایان تماس تأیید نشد. دوباره تلاش کنید."
          : code === "CHAT_CALL_ALREADY_ACTIVE" ? "در دستگاه یا تب دیگری در تماس هستید."
          : "درخواست تماس انجام نشد. دوباره تلاش کنید.");
    } finally {
      await reconcile();
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

  const displayedCall = callLive(call) ? call : finished;
  const name = displayedCall?.patientName || "بیمار";
  const end = <HangUpButton disabled={busy} onClick={() => void change()} label={active ? "پایان تماس" : "لغو تماس"} />;
  return <Calls.Provider value={{ start, beforeLogout, available, busy, error }}>
    {children}
    {displayedCall && typeof document !== "undefined" && createPortal(owner || finished
      ? <CallPanel key={displayedCall.id} floating expandRequest={expanded} call={displayedCall} name={name} frame={frame}
          disconnecting={disconnecting} finished={!!finished} onHangUp={() => void change()}
          error={error} frameError={frameError} endControl={end} joining={joining} recover={media => reconnect(media, true)}
          onEnded={() => {
            recordEnd(displayedCall.id);
            setCall(previous => previous?.id === displayedCall.id ? null : previous);
            if (!action.current) void reconcile();
          }} controls={<>
            {active && <button type="button" aria-label="تلاش مجدد" title="تلاش مجدد" className={callIconButton} onClick={() => reconnect()}><RotateCw size={20} /></button>}
            {end}
          </>} returnLink={<Link href={"/appointments/" + displayedCall.appointmentId} className="max-w-24 self-center px-1 text-center text-xs leading-tight">بازگشت به ویزیت بیمار</Link>} />
      : <aside dir="rtl" className="fixed bottom-3 left-3 z-[1000] rounded-xl border bg-card p-3 shadow-lg">
          <p>تماس با {name} در تب دیگری فعال است.</p>
          <button type="button" className="min-h-11 font-bold" onClick={() => transfer()}>انتقال به این تب</button>
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

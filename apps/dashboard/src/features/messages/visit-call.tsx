"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Video } from "lucide-react";
import type { ChatCall } from "@sabz-zendegi/api-client/chat-engine";
import { CallPanel, HangUpButton, callLabel, callLive, callStatus, useCallFrame } from "@sabz-zendegi/api-client/chat-ui";
import { chatEngine } from "@/lib/chat-api";

export function VisitCall({ token, appointmentId, participantName, canStart }: { token: string; appointmentId: string; participantName: string; canStart: boolean }) {
  const [available, setAvailable] = useState(false);
  const [call, setCall] = useState<ChatCall | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const activeId = call?.status === "ACTIVE" ? call.id : undefined;
  const { frame, frameError, reconnect } = useCallFrame(chatEngine, token, activeId);
  const id = call?.id;
  const live = callLive(call);

  useEffect(() => {
    let mounted = true;
    void chatEngine.video(token).then(({ available }) => { if (mounted) setAvailable(available); }).catch(() => {});
    void chatEngine.currentCall(token, appointmentId).then(({ call }) => {
      if (mounted && call) setCall(previous => previous ?? call);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [token, appointmentId]);

  useEffect(() => {
    if (!id || !live) return;
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll(callId: string) {
      try {
        const next = await chatEngine.call(token, callId);
        if (mounted && !actionLock.current) {
          setCall(next);
          setError("");
        }
      } catch {
        if (mounted) setError("وضعیت تماس موقتاً در دسترس نیست.");
      } finally {
        if (mounted) timer = setTimeout(() => void poll(callId), 2500);
      }
    }
    void poll(id);
    return () => { mounted = false; clearTimeout(timer); };
  }, [id, live, token]);

  async function change(mode?: ChatCall["mode"]) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode) setCall(await chatEngine.startCall(token, appointmentId, mode));
      else if (id) setCall(await chatEngine.callAction(token, id, "end"));
    } catch (failure) {
      setError(failure instanceof Error && failure.message === "CHAT_PATIENT_OFFLINE" ? "بیمار در برنامه آنلاین نیست."
        : mode ? "تماس آغاز نشد. دسترسی و وضعیت نوبت را بررسی کنید." : "پایان تماس ثبت نشد. دوباره تلاش کنید.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  if (!available) return null;
  return <>
    {!live && <div className="flex gap-1">
      {(["AUDIO", "VIDEO"] as const).map(mode => {
        const Icon = mode === "AUDIO" ? Phone : Video;
        return <button key={mode} type="button" disabled={!canStart || busy} title={callLabel(mode)} aria-label={callLabel(mode)} onClick={() => void change(mode)} className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-muted disabled:opacity-50">
          <Icon size={20} aria-hidden="true" />
        </button>;
      })}
    </div>}
    {call && live && <CallPanel key={call.id} call={call} name={participantName} frame={frame} error={error || frameError} controls={<>
      {activeId && <button type="button" className="min-h-11 rounded-full border border-border px-4" onClick={reconnect}>اتصال مجدد</button>}
      <HangUpButton disabled={busy} onClick={() => void change()} label={call.status === "RINGING" ? "لغو تماس" : "پایان تماس"} />
    </>} />}
    {!live && (error || call) && <div role={error ? "alert" : "status"} className="fixed inset-x-3 bottom-4 z-[100] mx-auto flex max-w-lg items-center justify-between gap-2 rounded-2xl border border-border bg-background px-3 text-sm shadow-lg">
      <span>{error || (call && callStatus(call))}</span>
      <button type="button" className="min-h-11 px-2" onClick={() => { setError(""); setCall(null); }}>بستن</button>
    </div>}
  </>;
}

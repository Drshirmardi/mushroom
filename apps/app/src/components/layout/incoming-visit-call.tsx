"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, PhoneIncoming, RotateCw } from "lucide-react";
import type { ChatCall } from "@sabz-zendegi/api-client/chat-engine";
import { CallPanel, HangUpButton, callIconButton, callLive, useCallFrame } from "@sabz-zendegi/api-client/chat-ui";
import { useAuthSession } from "@/components/auth/session-gate";
import { getPatientAppointment } from "@/lib/appointment-api";
import { chatEngine } from "@/lib/chat-api";
import { getPatientDoctor } from "@/lib/directory-api";

export function IncomingVisitCall() {
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;
  const [call, setCall] = useState<ChatCall | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [external, setExternal] = useState("");
  const flight = useRef(0);
  const ringtone = useRef<HTMLAudioElement>(null);
  const [joinId, setJoinId] = useState("");
  const active = call?.status === "ACTIVE" ? call.id : undefined;
  const { frame, frameError, joining, reconnect } = useCallFrame(chatEngine, token, active === joinId && !external ? active : undefined);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const before = flight.current;
      try {
        if (before % 2 !== 0) return;
        if (active) {
          const current = await chatEngine.call(token, active);
          if (mounted && before === flight.current) {
            setCall(callLive(current) ? current : null);
            setError("");
          }
        } else if (document.visibilityState === "visible") {
          const { call: next } = await chatEngine.incoming(token);
          if (mounted && before === flight.current) setCall(next);
        }
      } catch {
        if (mounted && active && before === flight.current) setError("وضعیت تماس موقتاً در دسترس نیست.");
      } finally {
        if (mounted) timer = setTimeout(() => void poll(), 2500);
      }
    }
    void poll();
    return () => { mounted = false; clearTimeout(timer); };
  }, [active, token]);

  useEffect(() => { setExternal(""); }, [active]);

  useEffect(() => {
    const appointmentId = call?.appointmentId;
    if (!appointmentId) {
      setDoctorName("");
      return;
    }
    let mounted = true;
    void getPatientAppointment(token, appointmentId)
      .then((appointment) => getPatientDoctor(token, appointment.doctorId))
      .then((doctor) => { if (mounted) setDoctorName(doctor.displayName.trim()); })
      .catch(() => { if (mounted) setDoctorName(""); });
    return () => { mounted = false; };
  }, [call?.appointmentId, token]);

  const ringingId = call?.status === "RINGING" ? call.id : null;
  useEffect(() => {
    if (!ringingId || busy) return;
    navigator.vibrate?.([200, 100, 200]);
    const audio = new Audio("/consultation-ring.wav");
    ringtone.current = audio;
    audio.loop = true;
    void audio.play().catch(() => {});
    return () => { ringtone.current = null; audio.pause(); navigator.vibrate?.(0); };
  }, [ringingId, busy]);

  async function action(command: "answer" | "decline" | "end") {
    if (!call || flight.current % 2 !== 0) return;
    flight.current += 1;
    ringtone.current?.pause();
    navigator.vibrate?.(0);
    setBusy(true);
    setError("");
    try {
      const current = await chatEngine.callAction(token, call.id, command);
      if (command === "answer" && current.status === "ACTIVE") setJoinId(current.id);
      setCall(callLive(current) ? current : null);
    } catch { setError("درخواست تماس انجام نشد. دوباره تلاش کنید."); }
    finally { flight.current += 1; setBusy(false); }
  }

  async function prepareExternal() {
    if (!active) return;
    try { setExternal((await chatEngine.callGrant(token, active)).url); }
    catch { setError("باز کردن تماس در مرورگر ممکن نشد."); }
  }

  if (!call) return null;
  const endControl = <HangUpButton disabled={busy} onClick={() => void action("end")} />;
  const retryLabel = active === joinId ? "اتصال مجدد" : "ادامهٔ تماس";
  return createPortal(<CallPanel key={call.id} call={call} name={doctorName || (call.callerKind === "DOCTOR" ? call.callerName || "پزشک" : "پزشک")} frame={frame} error={error || frameError} endControl={endControl} joining={joining} controls={active ? <>
    <button type="button" className={callIconButton} aria-label={retryLabel} title={retryLabel} onClick={() => { setExternal(""); setError(""); setJoinId(active); reconnect(); }}><RotateCw size={22} aria-hidden="true" /></button>
    {external ? <a href={external} target="_blank" rel="noreferrer" className={callIconButton} aria-label="باز کردن مرورگر" title="باز کردن مرورگر"><ExternalLink size={22} aria-hidden="true" /></a>
      : <button type="button" className={callIconButton} aria-label="ادامه در مرورگر" title="ادامه در مرورگر" onClick={() => void prepareExternal()}><ExternalLink size={22} aria-hidden="true" /></button>}
    {endControl}
  </> : <>
    <HangUpButton label="رد تماس" disabled={busy} onClick={() => void action("decline")} />
    <button type="button" className={callIconButton + " mushroom-call-answer"} aria-label="پاسخ" title="پاسخ" disabled={busy} onClick={() => void action("answer")}><PhoneIncoming size={22} aria-hidden="true" /></button>
  </>} />, document.body);
}

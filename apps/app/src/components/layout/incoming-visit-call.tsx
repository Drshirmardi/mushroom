"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneIncoming } from "lucide-react";
import type { ChatCall } from "@sabz-zendegi/api-client/chat-engine";
import { CallPanel, HangUpButton, callLive, useCallFrame } from "@sabz-zendegi/api-client/chat-ui";
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
  const active = call?.status === "ACTIVE" ? call.id : undefined;
  const { frame, frameError, reconnect } = useCallFrame(chatEngine, token, active);

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
    if (!ringingId) return;
    navigator.vibrate?.([200, 100, 200]);
    const ringtone = new Audio("/consultation-ring.wav");
    ringtone.loop = true;
    void ringtone.play().catch(() => {});
    return () => { ringtone.pause(); navigator.vibrate?.(0); };
  }, [ringingId]);

  async function action(command: "answer" | "decline" | "end") {
    if (!call || flight.current % 2 !== 0) return;
    flight.current += 1;
    setBusy(true);
    setError("");
    try {
      const current = await chatEngine.callAction(token, call.id, command);
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
  return <CallPanel key={call.id} call={call} name={doctorName || (call.callerKind === "DOCTOR" ? call.callerName || "پزشک" : "پزشک")} frame={external ? "" : frame} error={error || frameError} controls={active ? <>
    <button type="button" className="min-h-11 rounded-full border border-border px-3" onClick={() => { setExternal(""); setError(""); reconnect(); }}>اتصال مجدد</button>
    {external ? <a href={external} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-full border border-border px-3">باز کردن مرورگر</a>
      : <button type="button" className="min-h-11 rounded-full border border-border px-3" onClick={() => void prepareExternal()}>ادامه در مرورگر</button>}
    <HangUpButton disabled={busy} onClick={() => void action("end")} />
  </> : <>
    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50" disabled={busy} onClick={() => void action("answer")}><PhoneIncoming size={18} aria-hidden="true" />پاسخ</button>
    <HangUpButton label="رد تماس" disabled={busy} onClick={() => void action("decline")} />
  </>} />;
}

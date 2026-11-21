"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, PhoneIncoming, RotateCw } from "lucide-react";
import type { ChatCall } from "@sabz-zendegi/api-client/chat-engine";
import { CallPanel, HangUpButton, callIconButton, callLive, useCallFrame, useCallTab } from "@sabz-zendegi/api-client/chat-ui";
import { useAuthSession } from "@/components/auth/session-gate";
import { isBaleSession, openBaleBrowser } from "@/lib/bale-payment";
import { getPatientAppointment } from "@/lib/appointment-api";
import { chatEngine } from "@/lib/chat-api";
import { getPatientDoctor } from "@/lib/directory-api";

export function IncomingVisitCall({ onMinimizedChange }: { onMinimizedChange: (minimized: boolean, height?: number) => void }) {
  const { authentication, sessionKey } = useAuthSession();
  const token = authentication.accessToken;
  const [call, setCall] = useState<ChatCall | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [external, setExternal] = useState<{ url: string; expires: number } | null>(null);
  const [outside, setOutside] = useState(false);
  const ringingAudio = useRef<HTMLAudioElement>(null);
  const flight = useRef(0);
  const ringtone = useRef<HTMLAudioElement>(null);
  const { owner, transfer } = useCallTab(sessionKey);
  const [ending, setEnding] = useState("");
  const currentCallId = useRef<string | undefined>(undefined);
  useEffect(() => { if (call?.id) currentCallId.current = call.id; }, [call?.id]);
  const active = call?.status === "ACTIVE" ? call.id : undefined;
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; return () => { activeRef.current = undefined; }; }, [active]);
  const openingBrowser = useRef(false);
  const { frame, frameError, joining, reconnect } = useCallFrame(chatEngine, token, owner && !outside && (!active || typeof window === "undefined" || sessionStorage.getItem("mushroom-outside:" + sessionKey) !== active) ? active : undefined);

  const tokenRef = useRef(token);
  const incoming = useRef<ReturnType<typeof chatEngine.watchIncoming>>(null);
  useEffect(() => {
    tokenRef.current = token;
    incoming.current?.renew();
  }, [token]);

  useEffect(() => {
    const connection = chatEngine.watchIncoming(() => tokenRef.current, sessionKey, next => {
      if (flight.current % 2 === 0) { setCall(next); if (next) setEnding(""); }
    }, ended => {
      if (currentCallId.current !== ended.id) return;
      displayEnding(ended.reason);
    });
    incoming.current = connection;
    return () => { connection.disconnect(); incoming.current = null; };
  }, [sessionKey]);

  useEffect(() => {
    setExternal(null);
    setOutside(Boolean(active && sessionStorage.getItem("mushroom-outside:" + sessionKey) === active));
  }, [active, sessionKey]);

  function displayEnding(reason?: string | null) {
    currentCallId.current = undefined;
    setCall(null);
    if (reason === "staff_ended" || reason === "switched") setEnding("تماس توسط پزشک پایان یافت");
    if (reason === "lease_expired") setEnding("تماس به‌دلیل قطع ارتباط پایان یافت");
  }
  useEffect(() => {
    if (!ending) return;
    const timer = setTimeout(() => setEnding(""), 4000);
    return () => clearTimeout(timer);
  }, [ending]);

  useEffect(() => {
    const audio = new Audio("/consultation-ring.wav");
    ringingAudio.current = audio;
    const prime = () => {
      if (ringtone.current) return;
      audio.muted = true;
      void audio.play().then(() => {
        if (ringtone.current !== audio) { audio.pause(); audio.currentTime = 0; }
      }).catch(() => {}).finally(() => { audio.muted = false; });
    };
    window.addEventListener("pointerdown", prime, { once: true });
    return () => { window.removeEventListener("pointerdown", prime); audio.pause(); };
  }, []);

  useEffect(() => {
    if (!active || !owner || !navigator.wakeLock) return;
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    async function acquire() {
      if (document.visibilityState !== "visible" || lock && !lock.released) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed || document.visibilityState !== "visible") await next.release();
        else lock = next;
      } catch { /* The call continues when the platform denies wake lock. */ }
    }
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [active, owner]);

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
    if (!ringingId || busy || !owner) return;
    navigator.vibrate?.([200, 100, 200]);
    const audio = ringingAudio.current ?? new Audio("/consultation-ring.wav");
    ringtone.current = audio;
    audio.muted = false;
    audio.loop = true;
    void audio.play().catch(() => {});
    return () => { ringtone.current = null; audio.pause(); navigator.vibrate?.(0); };
  }, [ringingId, busy, owner]);

  async function action(command: "answer" | "decline" | "end") {
    if (!call || flight.current % 2 !== 0) return;
    flight.current += 1;
    ringtone.current?.pause();
    navigator.vibrate?.(0);
    setBusy(true);
    setError("");
    try {
      const current = await chatEngine.callAction(token, call.id, command);
      setCall(callLive(current) ? current : null);
    } catch { setError("درخواست تماس انجام نشد. دوباره تلاش کنید."); }
    finally { flight.current += 1; setBusy(false); }
  }

  async function prepareExternal() {
    if (!active || openingBrowser.current) return;
    if (external && external.expires > Date.now() && openBaleBrowser(external.url, false)) {
      sessionStorage.setItem("mushroom-outside:" + sessionKey, active);
      setOutside(true);
      setExternal(null);
      return;
    }
    openingBrowser.current = true;
    const popup = isBaleSession() ? null : window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    const expires = Date.now() + 40_000;
    try {
      const { url } = await chatEngine.callGrant(tokenRef.current, active);
      if (activeRef.current !== active) { popup?.close(); return; }
      if (popup && !popup.closed) {
        sessionStorage.setItem("mushroom-outside:" + sessionKey, active);
      setOutside(true);
        popup.location.replace(url);
      } else setExternal({ url, expires });
    } catch {
      popup?.close();
      if (activeRef.current === active) setError("باز کردن تماس در مرورگر ممکن نشد.");
    } finally { openingBrowser.current = false; }
  }

  if (!call) return ending ? createPortal(<p role="status" dir="rtl" className="fixed inset-x-4 top-4 z-[1000] rounded-xl bg-card p-3 text-center shadow">{ending}</p>, document.body) : null;
  if (!owner) return createPortal(<aside dir="rtl" className="fixed inset-x-4 top-4 z-[1000] rounded-xl bg-card p-3 shadow">
    <p>تماس در تب دیگری فعال است.</p><button type="button" className="min-h-11 font-bold" onClick={transfer}>انتقال به این تب</button>
  </aside>, document.body);
  const endControl = <HangUpButton disabled={busy} onClick={() => void action("end")} />;
  const retryLabel = outside ? "ادامهٔ تماس" : "اتصال مجدد";
  return createPortal(<CallPanel key={call.id} call={call} name={doctorName || (call.callerKind === "DOCTOR" ? call.callerName || "پزشک" : "پزشک")} frame={frame} error={error || frameError} endControl={endControl} joining={joining} recover={media => reconnect(media, true)} onMinimizedChange={onMinimizedChange} onEnded={displayEnding} controls={active ? <>
    <button type="button" className={callIconButton} aria-label={retryLabel} title={retryLabel} onClick={() => { setExternal(null); setOutside(false); setError(""); sessionStorage.removeItem("mushroom-outside:" + sessionKey); reconnect(); }}><RotateCw size={22} aria-hidden="true" /></button>
    {external && !isBaleSession()
      ? <a href={external.url} target="_blank" rel="noreferrer" className={callIconButton} aria-label="باز کردن مرورگر" onClick={event => {
        if (external.expires <= Date.now()) { event.preventDefault(); void prepareExternal(); }
        else setOutside(true);
      }}><ExternalLink size={22} aria-hidden="true" /></a>
      : <button type="button" className={callIconButton} aria-label={external ? "باز کردن مرورگر" : "ادامه در مرورگر"} title={external ? "باز کردن مرورگر" : "ادامه در مرورگر"} onClick={() => void prepareExternal()}><ExternalLink size={22} aria-hidden="true" /></button>}
    {endControl}
  </> : <>
    <HangUpButton label="رد تماس" disabled={busy} onClick={() => void action("decline")} />
    <button type="button" className={callIconButton + " mushroom-call-answer"} aria-label="پاسخ" title="پاسخ" disabled={busy} onClick={() => void action("answer")}><PhoneIncoming size={22} aria-hidden="true" /></button>
  </>} />, document.body);
}

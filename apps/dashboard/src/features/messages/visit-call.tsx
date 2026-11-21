"use client";

import { Phone, Video } from "lucide-react";
import { callLabel } from "@sabz-zendegi/api-client/chat-ui";
import { useDashboardCall } from "@/features/calls/call-provider";

export function VisitCall({ appointmentId, patientId, participantName, canStart }: { appointmentId: string; patientId?: string; participantName: string; canStart: boolean }) {
  const { available, busy, start, error } = useDashboardCall();
  if (!available) return null;
  return <div>
    <div className="flex gap-1">
      {(["AUDIO", "VIDEO"] as const).map(mode => {
        const Icon = mode === "AUDIO" ? Phone : Video;
        return <button key={mode} type="button" disabled={!canStart || busy} title={callLabel(mode)} aria-label={callLabel(mode)} onClick={() => start({ appointmentId, patientId, participantName, mode })} className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-muted disabled:opacity-50">
          <Icon size={20} aria-hidden="true" />
        </button>;
      })}
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}

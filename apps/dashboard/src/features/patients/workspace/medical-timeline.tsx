"use client";

import { TIMELINE_EVENTS } from "@/data/activity";

export function MedicalTimeline() {
  return (
    <div className="space-y-0">
      {TIMELINE_EVENTS.map((ev, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.color}`}><ev.icon size={16} /></div>
            {i < TIMELINE_EVENTS.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>
          <div className="pb-5 min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{ev.text}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ev.detail}</p>
            <p className="text-[0.65rem] text-muted-foreground/60 mt-1">{ev.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export const HOLD_DURATION_MS = 1500;

export function createHoldTimer(onComplete: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pressed = false;
  return {
    start() {
      if (pressed) return false;
      pressed = true;
      timer = setTimeout(() => { timer = null; onComplete(); }, HOLD_DURATION_MS);
      return true;
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null; pressed = false;
    },
  };
}

export function HoldDeleteButton({ title, disabled, onDelete }: { title: string; disabled: boolean; onDelete: () => void }) {
  const [holding, setHolding] = useState(false);
  const description = useId();
  const input = useRef<'pointer' | 'keyboard' | null>(null);
  const latest = useRef({ disabled, onDelete });
  latest.current = { disabled, onDelete };
  const timer = useMemo(() => createHoldTimer(() => {
    setHolding(false);
    if (!latest.current.disabled && !document.hidden && input.current !== null) latest.current.onDelete();
  }), []);
  const cancel = useCallback(() => { timer.cancel(); input.current = null; setHolding(false); }, [timer]);
  useEffect(() => { if (disabled) cancel(); }, [disabled, cancel]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => { timer.cancel(); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', hidden); };
  }, [timer, cancel]);

  const start = (method: 'pointer' | 'keyboard') => {
    if (latest.current.disabled || input.current !== null) return;
    input.current = method;
    if (timer.start()) setHolding(true);
  };

  return <>
    <button type="button" disabled={disabled} className="dashboard-button relative isolate overflow-hidden select-none touch-manipulation text-destructive" aria-label={`برای حذف ${title} دکمه را نگه دارید`} aria-describedby={description} title="برای حذف، کلیک را ۱٫۵ ثانیه نگه دارید" onClick={event => event.preventDefault()} onBlur={cancel}
      onPointerDown={event => { if (event.button !== 0 || !event.isPrimary) return; event.currentTarget.focus(); start('pointer'); }}
      onPointerUp={() => { if (input.current === 'pointer') cancel(); }}
      onPointerLeave={() => { if (input.current === 'pointer') cancel(); }}
      onPointerCancel={() => { if (input.current === 'pointer') cancel(); }}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) start('keyboard'); }
      }}
      onKeyUp={event => { if ((event.key === 'Enter' || event.key === ' ') && input.current === 'keyboard') { event.preventDefault(); cancel(); } }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 origin-right bg-destructive/20" style={{ transform: `scaleX(${holding ? 1 : 0})`, transition: holding ? `transform ${HOLD_DURATION_MS}ms linear` : 'none' }} />
      <Trash2 size={16} aria-hidden="true" /><span>{holding ? 'نگه دارید…' : 'برای حذف نگه دارید'}</span>
    </button>
    <span id={description} className="sr-only">کلیک، لمس یا کلید فاصله یا Enter را یک و نیم ثانیه نگه دارید. رهاکردن یا خروج از دکمه، حذف را لغو می‌کند.</span>
  </>;
}

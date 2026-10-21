"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export const HOLD_DURATION_MS = 1500;

export function createHoldTimer(onComplete: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pressed = false;
  return {
    start(complete = onComplete) {
      if (pressed) return false;
      pressed = true;
      timer = setTimeout(() => { timer = null; complete(); }, HOLD_DURATION_MS);
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
  useLayoutEffect(() => { latest.current = { disabled, onDelete }; }, [disabled, onDelete]);
  const [timer] = useState(() => createHoldTimer(() => {}));
  const cancel = useCallback(() => { timer.cancel(); input.current = null; setHolding(false); }, [timer]);
  const [previousDisabled, setPreviousDisabled] = useState(disabled);
  if (disabled !== previousDisabled) {
    setPreviousDisabled(disabled);
    if (disabled) setHolding(false);
  }
  useEffect(() => { if (disabled) { timer.cancel(); input.current = null; } }, [disabled, timer]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => { timer.cancel(); window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); document.removeEventListener('visibilitychange', hidden); };
  }, [timer, cancel]);

  const start = (method: 'pointer' | 'keyboard') => {
    if (latest.current.disabled || input.current !== null) return;
    input.current = method;
    if (timer.start(() => {
      setHolding(false);
      if (!latest.current.disabled && !document.hidden && input.current !== null) latest.current.onDelete();
    })) setHolding(true);
  };

  return <>
    <button type="button" disabled={disabled} className="dashboard-button relative isolate overflow-hidden whitespace-nowrap select-none touch-none text-destructive" aria-label={`برای حذف ${title} دکمه را نگه دارید`} aria-describedby={description} title="برای حذف، کلیک را ۱٫۵ ثانیه نگه دارید" onClick={event => event.preventDefault()} onBlur={cancel}
      onPointerDown={event => { if (event.button !== 0 || event.isPrimary === false || disabled) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); start('pointer'); }}
      onPointerMove={event => { if (input.current !== 'pointer') return; const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancel(); }}
      onPointerUp={() => { if (input.current === 'pointer') cancel(); }}
      onPointerLeave={event => { if (input.current === 'pointer' && !event.currentTarget.hasPointerCapture(event.pointerId)) cancel(); }}
      onPointerCancel={() => { if (input.current === 'pointer') cancel(); }}
      onLostPointerCapture={() => { if (input.current === 'pointer') cancel(); }}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) start('keyboard'); }
      }}
      onKeyUp={event => { if ((event.key === 'Enter' || event.key === ' ') && input.current === 'keyboard') { event.preventDefault(); cancel(); } }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 origin-right bg-destructive/20" style={{ transform: `scaleX(${holding ? 1 : 0})`, transition: holding ? `transform ${HOLD_DURATION_MS}ms linear` : 'none' }} />
      <Trash2 size={16} aria-hidden="true" /><span>برای حذف نگه دارید</span>
    </button>
    <span id={description} className="sr-only">کلیک، لمس یا کلید فاصله یا Enter را یک و نیم ثانیه نگه دارید. رهاکردن یا خروج از دکمه، حذف را لغو می‌کند.</span>
  </>;
}

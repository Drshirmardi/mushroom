"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";

/** Inertia projection window for release snapping, in milliseconds. */
const SNAP_PROJECTION_MS = 320;

export function ProductDetailPanel({ gallery, children }: { gallery: ReactNode; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const gesture = useRef({ y: 0, scroll: 0, moved: false, lastY: 0, lastTime: 0, velocity: 0 });
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const detent = () => {
    const root = viewport.current;
    const element = sheet.current;
    return root && element ? root.scrollTop + element.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop : 0;
  };
  const settleAt = (target: number) => {
    viewport.current?.scrollTo({ top: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  // Keep viewport height handling independent of the product-copy presentation.
  // The section navigation and scroll spy were removed; drag/snap remains unchanged.
  useEffect(() => {
    const root = viewport.current;
    const container = sheet.current;
    if (!root || !container) return;
    const handle = container.querySelector<HTMLElement>(".store-detail__handle-button");
    const sync = () => {
      const handleHeight = handle?.getBoundingClientRect().height ?? 0;
      root.dataset.compact = String(root.clientHeight < handleHeight + 96);
      const sheetTop = root.scrollTop + container.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop;
      setExpanded(handleHeight > 0 && root.scrollTop >= sheetTop - 2);
    };
    const resize = new ResizeObserver(sync);
    [root, container, handle].forEach(element => { if (element) resize.observe(element); });
    sync();
    return () => {
      resize.disconnect();
      delete root.dataset.compact;
    };
  }, [children]);

  return <div ref={viewport} className="store-detail store-detail--panel" tabIndex={0} role="region" aria-label="جزئیات محصول و تصاویر"
    onScroll={() => {
      if (viewport.current && sheet.current) setExpanded(viewport.current.scrollTop >= detent() - 2);
    }}>
    {gallery}
    <section ref={sheet} className="store-detail__sheet" data-expanded={expanded} aria-label="اطلاعات محصول">
      <button type="button" className="store-detail__handle-button" aria-label={expanded ? "نمایش تصاویر محصول" : "باز کردن مشخصات و توضیحات"} aria-expanded={expanded}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") { event.preventDefault(); settleAt(0); }
          else if (event.key === "ArrowDown") { event.preventDefault(); settleAt(detent()); }
        }}
        onClick={() => {
          if (gesture.current.moved) { gesture.current.moved = false; return; }
          settleAt(expanded ? 0 : detent());
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          gesture.current = { y: event.clientY, scroll: viewport.current?.scrollTop ?? 0, moved: false, lastY: event.clientY, lastTime: event.timeStamp, velocity: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || !viewport.current) return;
          const state = gesture.current;
          const delta = state.y - event.clientY;
          if (Math.abs(delta) > 4) state.moved = true;
          const elapsed = event.timeStamp - state.lastTime;
          if (elapsed > 0) state.velocity = (state.lastY - event.clientY) / elapsed;
          state.lastY = event.clientY;
          state.lastTime = event.timeStamp;
          viewport.current.scrollTop = state.scroll + delta;
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          const state = gesture.current;
          if (!state.moved || !viewport.current) return;
          const top = viewport.current.scrollTop;
          const end = detent();
          // Project release with the drag's own momentum, then snap to the nearest detent.
          const target = top + state.velocity * SNAP_PROJECTION_MS > end / 2 ? end : 0;
          settleAt(Math.max(0, Math.min(end, target)));
        }}
        onPointerCancel={() => { gesture.current.moved = false; }}>
        <span className="store-detail__handle" aria-hidden="true" />
        <span className="store-detail__handle-label">
          {expanded ? "برگشت به تصویر" : "مشخصات و توضیحات"}
          <ChevronUp className="store-detail__handle-chevron" aria-hidden="true" size={15} />
        </span>
      </button>
      {children}
    </section>
  </div>;
}

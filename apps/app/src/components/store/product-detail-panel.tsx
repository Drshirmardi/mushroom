"use client";

import { useRef, useState, type ReactNode } from "react";

export function ProductDetailPanel({ gallery, children }: { gallery: ReactNode; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const gesture = useRef({ y: 0, scroll: 0, moved: false });
  const [expanded, setExpanded] = useState(false);
  return <div ref={viewport} className="store-detail store-detail--panel" tabIndex={0} role="region" aria-label="جزئیات محصول و تصاویر"
    onScroll={() => {
      if (viewport.current && sheet.current) setExpanded(viewport.current.scrollTop >= sheet.current.offsetTop - 2);
    }}>
    {gallery}
    <section ref={sheet} className="store-detail__sheet" data-expanded={expanded} aria-label="اطلاعات محصول">
      <button type="button" className="store-detail__handle-button" aria-label={expanded ? "نمایش تصاویر محصول" : "باز کردن جزئیات محصول"} aria-expanded={expanded}
        onClick={() => {
          if (gesture.current.moved) { gesture.current.moved = false; return; }
          viewport.current?.scrollTo({ top: expanded ? 0 : sheet.current?.offsetTop ?? 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          gesture.current = { y: event.clientY, scroll: viewport.current?.scrollTop ?? 0, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || !viewport.current) return;
          const delta = gesture.current.y - event.clientY;
          if (Math.abs(delta) > 4) gesture.current.moved = true;
          viewport.current.scrollTop = gesture.current.scroll + delta;
        }}
        onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { gesture.current.moved = false; }}>
        <span className="store-detail__handle" aria-hidden="true" />
        <span className="store-detail__handle-label">{expanded ? "برگشت به تصویر" : "مشخصات و توضیحات"}</span>
      </button>
      {children}
    </section>
  </div>;
}

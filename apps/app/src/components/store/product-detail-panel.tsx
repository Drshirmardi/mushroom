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

  useEffect(() => {
    const root = viewport.current;
    const container = sheet.current;
    if (!root || !container) return;
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>(".store-content-nav a[href^='#']"));
    if (links.length === 0) return;
    const entries = links
      .map((link) => ({ link, target: container.querySelector<HTMLElement>(link.getAttribute("href") ?? "") }))
      .filter((entry): entry is { link: HTMLAnchorElement; target: HTMLElement } => entry.target !== null);
    if (entries.length === 0) return;
    const handle = container.querySelector<HTMLElement>(".store-detail__handle-button");
    const strip = container.querySelector<HTMLElement>(".store-content-nav");
    let selected: typeof entries[number] | null = null;
    const position = (element: HTMLElement) => root.scrollTop + element.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop;
    const offset = () => Math.max(handle?.getBoundingClientRect().height ?? 0, strip ? parseFloat(getComputedStyle(strip).top) || 0 : 0) + (strip?.getBoundingClientRect().height ?? 0) + 8;
    const clear = () => entries.forEach(({ link }) => link.removeAttribute("aria-current"));
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(".store-content-nav a[href^='#']");
      if (!link) return;
      const target = container.querySelector<HTMLElement>(link.getAttribute("href") ?? "");
      if (!target) return;
      event.preventDefault();
      selected = entries.find(entry => entry.target === target) ?? null;
      root.scrollTo({ top: Math.max(0, position(target) - offset()), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      sync();
    };
    const sync = () => {
      let current = entries[0];
      const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 2;
      if (atEnd) current = entries[entries.length - 1];
      else for (const entry of entries) if (root.scrollTop >= position(entry.target) - offset() - 4) current = entry;
      // A short final section may clamp scrolling; retain the clicked destination until manual scrolling.
      if (selected) current = selected;
      entries.forEach(({ link, target }) => {
        if (target === current.target) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      if (strip) {
        const bounds = strip.getBoundingClientRect();
        const chip = current.link.getBoundingClientRect();
        const delta = chip.left < bounds.left + 8 ? chip.left - bounds.left - 8 : chip.right > bounds.right - 8 ? chip.right - bounds.right + 8 : 0;
        if (delta) strip.scrollBy({ left: delta, behavior: "instant" });
      }
    };
    const manual = () => { selected = null; };
    const keyboard = (event: KeyboardEvent) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) manual(); };
    const resize = new ResizeObserver(() => {
      selected = null;
      setExpanded(Boolean(handle?.getBoundingClientRect().height) && root.scrollTop >= position(container) - 2);
      sync();
    });
    [root, container, handle, strip].forEach(element => { if (element) resize.observe(element); });
    container.addEventListener("click", onClick);
    root.addEventListener("scroll", sync, { passive: true });
    root.addEventListener("wheel", manual, { passive: true });
    root.addEventListener("pointerdown", manual);
    root.addEventListener("keydown", keyboard);
    sync();
    return () => {
      container.removeEventListener("click", onClick);
      root.removeEventListener("scroll", sync);
      root.removeEventListener("wheel", manual);
      root.removeEventListener("pointerdown", manual);
      root.removeEventListener("keydown", keyboard);
      resize.disconnect();
      clear();
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

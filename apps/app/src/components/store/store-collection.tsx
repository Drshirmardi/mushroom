"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

/** A collection is derived from catalog data, never an implied promotion. */
export function StoreCollection({ title, id, onViewAll, railClassName, header, children }: {
  title: string;
  id: string;
  onViewAll?: () => void;
  railClassName?: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const drag = useRef({ active: false, moved: false, x: 0, origin: 0 });
  const [dragging, setDragging] = useState(false);
  const velocity = useRef(0);
  const lastTime = useRef(0);
  const inertia = useRef<number | null>(null);
  const cancelInertia = () => {
    if (inertia.current !== null) { cancelAnimationFrame(inertia.current); inertia.current = null; }
  };
  useEffect(() => () => cancelInertia(), []);
  const updateEdges = () => {
    const element = rail.current;
    if (!element) return;
    const position = Math.abs(element.scrollLeft);
    const previous = position > 2;
    const next = position < element.scrollWidth - element.clientWidth - 2;
    setEdges((current) => (current.previous === previous && current.next === next ? current : { previous, next }));
  };
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    updateEdges();
    return () => observer.disconnect();
  }, [children]);
  const move = (forward: boolean) => {
    const element = rail.current;
    if (!element) return;
    cancelInertia();
    const direction = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    element.scrollBy({ left: direction * (forward ? 1 : -1) * element.clientWidth * .8, behavior: "auto" });
  };
  /** Mouse drag-to-scroll: pointer follows content in both LTR and RTL. Touch keeps native scrolling. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    cancelInertia();
    drag.current = { active: true, moved: false, x: event.clientX, origin: event.clientX };
    velocity.current = 0;
    lastTime.current = event.timeStamp;
    setDragging(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const element = rail.current;
    if (!state.active || !element) return;
    const dx = event.clientX - state.x;
    const dt = Math.max(event.timeStamp - lastTime.current, 1);
    velocity.current = velocity.current * 0.7 + (dx / dt) * 0.3;
    lastTime.current = event.timeStamp;
    if (Math.abs(event.clientX - state.origin) > 6) state.moved = true;
    if (dx !== 0) element.scrollBy({ left: -dx, behavior: "auto" });
    state.x = event.clientX;
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    /** Native-like glide after release, same direction mapping as the drag. */
    const start = velocity.current;
    velocity.current = 0;
    if (drag.current.moved && Math.abs(start) > 0.15) {
      let current = start;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(now - last, 50);
        last = now;
        const element = rail.current;
        if (!element) { inertia.current = null; return; }
        element.scrollBy({ left: -current * dt, behavior: "auto" });
        current *= Math.pow(0.94, dt / 16.7);
        if (Math.abs(current) < 0.02) { inertia.current = null; return; }
        inertia.current = requestAnimationFrame(step);
      };
      inertia.current = requestAnimationFrame(step);
    }
  };
  /** A drag ending on a link must not navigate. */
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      drag.current.moved = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };
  return <section className="store-collection" aria-labelledby={id}>
    {header ?? <header className="store-collection__header">
      <h2 id={id}>{title}</h2>
      {onViewAll && <Button variant="ghost" onClick={onViewAll} aria-label={`مشاهده همهٔ ${title}`}>مشاهده همه</Button>}
    </header>}
    <div className="store-collection__viewport">
      <div ref={rail} id={`${id}-rail`} className={`store-product-rail${dragging ? " store-product-rail--dragging" : ""}${railClassName ? ` ${railClassName}` : ""}`}
      onScroll={updateEdges} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag} onWheel={cancelInertia}
      onDragStart={(event) => event.preventDefault()} onClickCapture={onClickCapture}
      tabIndex={0} role="region" aria-labelledby={id}>{children}</div>
      {(edges.previous || edges.next) && <>
        <Button variant="ghost" className="store-collection__arrow store-collection__arrow--previous"
          aria-label={`محصولات قبلیِ ${title}`} aria-controls={`${id}-rail`} disabled={!edges.previous} onClick={() => move(false)}>
          <ChevronRight size={22} aria-hidden="true" />
        </Button>
        <Button variant="ghost" className="store-collection__arrow store-collection__arrow--next"
          aria-label={`محصولات بعدیِ ${title}`} aria-controls={`${id}-rail`} disabled={!edges.next} onClick={() => move(true)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </Button>
      </>}
    </div>
  </section>;
}

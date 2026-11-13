"use client";

import { Children, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type TransitionEvent } from "react";
import { StoreIcon } from "./store-icon";
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
      tabIndex={0} role="group" aria-labelledby={id}>{children}</div>
      {(edges.previous || edges.next) && <>
        <Button variant="ghost" className="store-collection__arrow store-collection__arrow--previous"
          aria-label={`محصولات قبلیِ ${title}`} aria-controls={`${id}-rail`} disabled={!edges.previous} onClick={() => move(false)}>
          <StoreIcon name="arrow2Right" size={22} />
        </Button>
        <Button variant="ghost" className="store-collection__arrow store-collection__arrow--next"
          aria-label={`محصولات بعدیِ ${title}`} aria-controls={`${id}-rail`} disabled={!edges.next} onClick={() => move(true)}>
          <StoreIcon name="arrow2Left" size={22} />
        </Button>
      </>}
    </div>
  </section>;
}

/** Digipay-style product carousel: a centered active card, scaled side cards, and a looping track. */
export function StoreProductCarousel({ title, id, children }: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [physicalIndex, setPhysicalIndex] = useState(slides.length > 1 ? 1 : 0);
  const [animate, setAnimate] = useState(false);
  const suppressClick = useRef(false);
  const count = slides.length;
  const hasLoop = count > 1;
  const trackSlides = hasLoop
    ? [slides[count - 1], ...slides, slides[0]]
    : slides;
  const activeIndex = hasLoop ? (physicalIndex - 1 + count) % count : 0;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewportWidth(element.clientWidth));
    observer.observe(element);
    setViewportWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPhysicalIndex(hasLoop ? 1 : 0);
    setAnimate(false);
  }, [count, hasLoop]);

  const goToPhysical = (next: number) => {
    if (!hasLoop || next === physicalIndex) return;
    setAnimate(true);
    setPhysicalIndex(next);
  };
  const move = (direction: -1 | 1) => goToPhysical(physicalIndex + direction);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(-1); }
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointer.current = { x: event.clientX, id: event.pointerId, moved: false };
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    const distance = event.clientX - start.x;
    if (Math.abs(distance) < 36) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    start.moved = true;
    move(distance < 0 ? 1 : -1);
  };
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const onTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform" || !hasLoop) return;
    if (physicalIndex === 0 || physicalIndex === count + 1) {
      setAnimate(false);
      setPhysicalIndex(physicalIndex === 0 ? count : 1);
      requestAnimationFrame(() => setAnimate(true));
    }
  };
  const offset = physicalIndex * 160 - (viewportWidth - 150) / 2;

  return <section className="store-collection" aria-labelledby={id}>
    <header className="store-collection__header"><h2 id={id}>{title}</h2></header>
    <div className="store-personal-carousel" aria-roledescription="carousel" aria-label={title}>
      <div
        ref={viewport}
        className="store-personal-carousel__viewport"
        tabIndex={0}
        role="group"
        aria-label="برای جابه‌جایی کارت‌ها بکشید یا از کلیدهای جهت استفاده کنید"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointer.current = null; }}
        onClickCapture={onClickCapture}
      >
        <div
          className={`store-personal-carousel__track${animate ? " is-animating" : ""}`}
          style={{ transform: `translate3d(${offset}px, 0, 0)` }}
          onTransitionEnd={onTrackTransitionEnd}
        >
          {trackSlides.map((slide, index) => {
            const realIndex = hasLoop ? (index - 1 + count) % count : index;
            const isActive = index === physicalIndex;
            const isClone = hasLoop && (index === 0 || index === trackSlides.length - 1);
            return <div
              className={`store-personal-carousel__slide${isActive ? " is-active" : ""}`}
              key={`${index}-${realIndex}`}
              role="group"
              aria-roledescription="اسلاید"
              aria-label={`${realIndex + 1} از ${count}`}
              aria-hidden={isClone || undefined}
              inert={isClone || undefined}
            >{slide}</div>;
          })}
        </div>
      </div>
      {count > 1 && <div className="store-personal-carousel__dots" role="group" aria-label="انتخاب محصول">
        {slides.map((_, index) => <button
          key={index}
          type="button"
          className={`store-personal-carousel__dot${activeIndex === index ? " is-active" : ""}`}
          aria-label={`نمایش محصول ${index + 1}`}
          aria-current={activeIndex === index ? "true" : undefined}
          onClick={() => {
            if (activeIndex === count - 1 && index === 0) goToPhysical(count + 1);
            else if (activeIndex === 0 && index === count - 1) goToPhysical(0);
            else goToPhysical(index + 1);
          }}
        />)}
      </div>}
    </div>
  </section>;
}

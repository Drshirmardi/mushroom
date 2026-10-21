"use client";

import { useEffect, useRef, useState } from "react";
import { FileImage } from "lucide-react";
import { toP } from "../../lib/format";
import { ProductImage } from "./product-image";

function Counter({ index, total }: { index: number; total: number }) {
  return <div className="store-gallery__counter" aria-hidden="true">
    <FileImage size={13} />
    <span>{toP(index + 1)}</span>
    <span className="store-gallery__divider" />
    <span className="store-gallery__track">
      <span className="store-gallery__bar" style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }} />
    </span>
  </div>;
}

/** Photos stay in the page; thumbnails and keyboard controls select the main image. */
export function ProductGallery({ official, buyer, title }: { official: string[]; buyer: string[]; title: string }) {
  const images = [...official, ...buyer];
  const fingerprint = images.join("|");
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, x: 0, y: 0, rubber: false });
  // Product switching or replacement resets the position; length alone is not enough.
  useEffect(() => { setIndex(0); }, [fingerprint]);
  const onScroll = () => {
    const element = track.current;
    if (!element || images.length === 0) return;
    const viewport = element.getBoundingClientRect();
    const center = (viewport.left + viewport.right) / 2;
    let next = 0;
    let distance = Infinity;
    Array.from(element.children).forEach((slide, position) => {
      const bounds = slide.getBoundingClientRect();
      const candidate = Math.abs((bounds.left + bounds.right) / 2 - center);
      if (candidate < distance) { distance = candidate; next = position; }
    });
    setIndex((current) => (current === next ? current : next));
  };
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const observer = new ResizeObserver(onScroll);
    observer.observe(element);
    return () => observer.disconnect();
  }, [official, buyer]);
  const selectImage = (position: number) => {
    const element = track.current;
    const slide = element?.children[position];
    if (!element || !slide) return;
    const viewport = element.getBoundingClientRect();
    const bounds = slide.getBoundingClientRect();
    const left = getComputedStyle(element).direction === "rtl" ? bounds.right - viewport.right : bounds.left - viewport.left;
    setIndex(position);
    element.scrollBy({ left, behavior: "auto" });
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    drag.current = { active: true, x: event.clientX, y: event.clientY, rubber: false };
    const element = track.current;
    if (element) element.style.transition = "";
    setDragging(true);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const element = track.current;
    if (!state.active || !element) return;
    const canScroll = element.scrollWidth > element.clientWidth + 1;
    if (!canScroll) {
      // Single slide: nothing to scroll toward, so answer the gesture with an
      // elastic nudge instead of dead silence. Purely visual; never moves layout.
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) {
        if (state.rubber) { state.rubber = false; element.style.transform = ""; }
        return;
      }
      const clamped = Math.max(-72, Math.min(72, dx * 0.35));
      state.rubber = true;
      element.style.transform = `translate3d(${clamped}px,0,0)`;
      return;
    }
    if (event.pointerType !== "mouse") return;
    const dx = event.clientX - state.x;
    if (dx !== 0) element.scrollBy({ left: -dx, behavior: "auto" });
    state.x = event.clientX;
  };
  const endDrag = () => {
    const state = drag.current;
    if (!state.active) return;
    state.active = false;
    setDragging(false);
    const element = track.current;
    if (element && state.rubber) {
      state.rubber = false;
      element.style.transition = "transform 280ms cubic-bezier(.2,.8,.3,1)";
      element.style.transform = "";
    }
  };
  if (images.length === 0) {
    return <div className="store-gallery">
      <div
        ref={track}
        className={`store-gallery__strip store-gallery__strip--single${dragging ? " store-gallery__strip--dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="store-gallery__slide" role="group" aria-roledescription="slide" aria-label={`تصویر ${title}`}>
          <ProductImage src={null} alt={title} />
        </div>
      </div>
    </div>;
  }
  return <div className="store-gallery">
    <div
      ref={track}
      className={`store-gallery__strip${dragging ? " store-gallery__strip--dragging" : ""}${images.length <= 1 ? " store-gallery__strip--single" : ""}`}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onKeyDown={(event) => {
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : index + ((event.key === "ArrowLeft") === rtl ? 1 : -1);
        selectImage(Math.max(0, Math.min(images.length - 1, next)));
      }}
      tabIndex={0}
      role="region"
      aria-label="تصویرهای محصول"
      aria-roledescription="carousel"
    >
      {images.map((src, slide) => (
        <div key={`${src}-${slide}`} className="store-gallery__slide" role="group" aria-roledescription="slide" aria-label={`${toP(slide + 1)} از ${toP(images.length)}`}>
          <ProductImage src={src} alt={slide === 0 ? title : ""} eager={slide === 0} />
        </div>
      ))}
    </div>
    {images.length > 1 && <Counter index={index} total={images.length} />}
    {images.length > 1 && <div className="store-mosaic store-mosaic--pair">
      {images.map((src, tile) => <button key={`${src}-${tile}`} type="button" className="store-mosaic__tile" aria-label={`نمایش تصویر ${toP(tile + 1)} ${title}`} aria-pressed={index === tile} onClick={() => selectImage(tile)}>
        <ProductImage src={src} alt="" />
        {tile === 0 && official.length > 0 && <span className="store-mosaic__tag">رسمی</span>}
        {tile === official.length && buyer.length > 0 && <span className="store-mosaic__tag">خریدار</span>}
      </button>)}
    </div>}
  </div>;
}

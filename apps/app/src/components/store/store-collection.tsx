"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

/** A collection is derived from catalog data, never an implied promotion. */
export function StoreCollection({ title, id, onViewAll, children }: {
  title: string;
  id: string;
  onViewAll: () => void;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });
  const updateEdges = () => {
    const element = rail.current;
    if (!element) return;
    const position = Math.abs(element.scrollLeft);
    setEdges({ previous: position > 2, next: position < element.scrollWidth - element.clientWidth - 2 });
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
    const direction = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    element.scrollBy({ left: direction * (forward ? 1 : -1) * element.clientWidth * .8, behavior: "auto" });
  };
  return <section className="store-collection" aria-labelledby={id}>
    <header className="store-collection__header">
      <h2 id={id}>{title}</h2>
      <Button variant="ghost" onClick={onViewAll} aria-label={`مشاهده همهٔ ${title}`}>مشاهده همه</Button>
    </header>
    <div className="store-collection__controls">
      <Button variant="secondary" className="store-icon-button" aria-label={`محصولات قبلی ${title}`} aria-controls={`${id}-rail`} disabled={!edges.previous} onClick={() => move(false)}><ChevronRight aria-hidden="true" size={20} /></Button>
      <Button variant="secondary" className="store-icon-button" aria-label={`محصولات بعدی ${title}`} aria-controls={`${id}-rail`} disabled={!edges.next} onClick={() => move(true)}><ChevronLeft aria-hidden="true" size={20} /></Button>
    </div>
    <div ref={rail} id={`${id}-rail`} className="store-product-rail" onScroll={updateEdges} tabIndex={0} role="region" aria-labelledby={id}>{children}</div>
  </section>;
}

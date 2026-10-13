"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "../ui/button";
import type { ProductSpec } from "../../stores/product-extras";

/** Key specs as a minimal horizontal rail plus an expandable full specification table. */
export function ProductSpecs({ specs }: { specs: ProductSpec[] }) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, x: 0 });
  const onPointerDown = (event: React.PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { active: true, x: event.clientX };
    setDragging(true);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLUListElement>) => {
    const state = drag.current;
    const element = track.current;
    if (!state.active || !element) return;
    const dx = event.clientX - state.x;
    if (dx !== 0) element.scrollBy({ left: -dx, behavior: "auto" });
    state.x = event.clientX;
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
  };
  if (specs.length === 0) return null;
  return <section className="store-specs" aria-label="مشخصات کالا">
    <h3>مشخصات کالا</h3>
    <ul
      ref={track}
      className={`store-spec-rail${dragging ? " store-spec-rail--dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      {specs.slice(0, 5).map((spec) => (
        <li key={spec.key} className="store-spec-chip">
          <span className="store-spec-chip__key">{spec.key}<ChevronLeft size={12} aria-hidden="true" /></span>
          <strong>{spec.value}</strong>
        </li>
      ))}
    </ul>
    <Button variant="ghost" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      {open ? "بستن مشخصات" : "مشاهده همه مشخصات"}
      <ChevronDown size={16} aria-hidden="true" className={open ? "store-flip" : undefined} />
    </Button>
    {open && <table className="store-spec-table"><tbody>
      {specs.map((spec) => (
        <tr key={spec.key}><th scope="row">{spec.key}</th><td>{spec.value}</td></tr>
      ))}
    </tbody></table>}
  </section>;
}

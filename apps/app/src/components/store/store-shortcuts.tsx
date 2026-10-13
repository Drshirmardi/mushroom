"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { StoreShortcut } from "../../stores/shortcuts";

/** Circle shortcut rail (test artwork, our destinations): native touch scroll + mouse drag. */
export function StoreShortcuts({ items, onShortcut }: { items: StoreShortcut[]; onShortcut: (shortcut: StoreShortcut) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, moved: false, x: 0, origin: 0 });
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { active: true, moved: false, x: event.clientX, origin: event.clientX };
    setDragging(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const element = track.current;
    if (!state.active || !element) return;
    const dx = event.clientX - state.x;
    if (Math.abs(event.clientX - state.origin) > 6) state.moved = true;
    if (dx !== 0) element.scrollBy({ left: -dx, behavior: "auto" });
    state.x = event.clientX;
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
  };
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      drag.current.moved = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };
  if (items.length === 0) return null;
  return <div
    ref={track}
    className={`store-shortcuts${dragging ? " store-shortcuts--dragging" : ""}`}
    role="list"
    aria-label="میان‌برهای فروشگاه"
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={endDrag}
    onPointerCancel={endDrag}
    onPointerLeave={endDrag}
    onDragStart={(event) => event.preventDefault()}
    onClickCapture={onClickCapture}
  >
    {items.map((item) => (
      <button key={item.id} type="button" role="listitem" className="store-shortcut" onClick={() => onShortcut(item)} aria-label={item.label}>
        <img src={item.image} alt="" loading="lazy" draggable={false} width={52} height={52} />
        <span>{item.label}</span>
      </button>
    ))}
  </div>;
}

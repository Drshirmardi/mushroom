"use client";
import { useEffect } from "react";
type Position = { top: number; productId?: string; offset?: number; expanded?: boolean };
const positions = new Map<string, Position>();
export const browsePosition = (key: string) => positions.get(key);
export function saveExpansion(key: string, expanded: boolean) { positions.set(key, {...positions.get(key), top:positions.get(key)?.top ?? 0, expanded}); }
export function useStoreBrowse(key: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const root = document.querySelector<HTMLElement>(".patient-shell-content");
    if (!root) return;
    const saved = positions.get(key);
    const anchor = Array.from(root.querySelectorAll<HTMLElement>("[data-product-id]")).find(e=>e.dataset.productId===saved?.productId);
    if (saved) root.scrollTop = anchor && saved.offset !== undefined ? root.scrollTop + anchor.getBoundingClientRect().top - root.getBoundingClientRect().top - saved.offset : saved.top;
    else root.scrollTop = 0;
    const save = () => {
      const anchor = Array.from(root.querySelectorAll<HTMLElement>("[data-product-id]")).find(e=>e.getBoundingClientRect().bottom>root.getBoundingClientRect().top);
      positions.set(key, {expanded:positions.get(key)?.expanded, top:root.scrollTop, productId:anchor?.dataset.productId, offset:anchor ? anchor.getBoundingClientRect().top-root.getBoundingClientRect().top : undefined});
      if (positions.size>40) positions.delete(positions.keys().next().value!);
    };
    root.addEventListener("scroll",save,{passive:true});
    save();
    return () => { root.removeEventListener("scroll",save); };
  },[key,ready]);
}

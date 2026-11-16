'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export const ShellSlots = createContext<{ action: HTMLElement | null; overlay: HTMLElement | null }>({ action: null, overlay: null });
export function ShellAction({ children }: { children: ReactNode }) {
  const { action } = useContext(ShellSlots);
  return action ? createPortal(children, action) : null;
}
export function ShellOverlay({ children }: { children: ReactNode }) {
  const { overlay } = useContext(ShellSlots);
  return overlay ? createPortal(children, overlay) : null;
}

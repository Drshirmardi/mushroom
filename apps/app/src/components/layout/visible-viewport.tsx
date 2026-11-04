'use client';
import { useEffect } from 'react';

/** One observer for the document, including entry screens and native dialogs. */
export function VisibleViewport() {
  useEffect(() => {
    const root = document.documentElement, viewport = window.visualViewport;
    let frame = 0, baseline = window.innerHeight, width = window.innerWidth, editing = false;
    const editable = () => {
      const element = document.activeElement;
      return element instanceof HTMLTextAreaElement || element instanceof HTMLElement && element.isContentEditable || element instanceof HTMLInputElement && !element.readOnly && !element.disabled && !['button','submit','checkbox','radio','range','color','file','hidden'].includes(element.type);
    };
    const update = () => {
      frame = 0;
      const focused = editable();
      if (Math.abs(window.innerWidth - width) > 80) { width = window.innerWidth; baseline = window.innerHeight; editing = false; }
      if (focused && !editing) baseline = Math.max(baseline, window.innerHeight);
      if (!focused) baseline = window.innerHeight;
      editing = focused;
      const zoomed = viewport && Math.abs(viewport.scale - 1) > .05;
      const height = viewport?.height ?? window.innerHeight;
      const touch = window.matchMedia('(pointer: coarse)').matches;
      const threshold = Math.max(120, baseline * .2);
      const keyboard = focused && !zoomed && (viewport ? baseline - height > threshold && (touch || window.innerHeight - height > threshold) : touch);
      root.dataset.keyboardOpen = String(keyboard);
      // Pinch zoom must retain normal browser panning and layout scale.
      if (!zoomed) {
        root.style.setProperty('--app-visible-height', `${height}px`);
        root.style.setProperty('--app-viewport-top', `${keyboard ? viewport?.offsetTop ?? 0 : 0}px`);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const events = ['resize','orientationchange','focusin','focusout'] as const;
    events.forEach(event => window.addEventListener(event, schedule));
    viewport?.addEventListener('resize', schedule); viewport?.addEventListener('scroll', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame); events.forEach(event => window.removeEventListener(event, schedule));
      viewport?.removeEventListener('resize', schedule); viewport?.removeEventListener('scroll', schedule);
      delete root.dataset.keyboardOpen; root.style.removeProperty('--app-visible-height'); root.style.removeProperty('--app-viewport-top');
    };
  }, []);
  return null;
}

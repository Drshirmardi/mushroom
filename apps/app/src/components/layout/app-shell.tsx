'use client';

import { useEffect, useRef, useState } from 'react';
import { ShellSlots } from './shell-slots';
import { usePathname } from 'next/navigation';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { GlobalSheet } from '@/components/shared/global-sheet';
import { useUiStore } from '@/stores/ui';

/**
 * Phone-sized app shell shared by all migrated routes: page headers,
 * scrollable content area, bottom tab bar and global sheet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isStorefront = pathname === '/store';
  const isStore = pathname === '/store' || pathname.startsWith('/store/');
  const isProduct = pathname.startsWith('/store/products/');
  const immersive = useUiStore((state) => state.immersive);

  const [action, setAction] = useState<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = footer.current;
    if (!element) return;
    const measure = () =>
      frame.current?.style.setProperty(
        '--app-footer-height',
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const handleShellWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (immersive || event.defaultPrevented || event.ctrlKey || ! event.deltaY) return;
    const scrollEl = content.current;
    const target = event.target;
    if (!scrollEl || !(target instanceof Node)) return;
    if (scrollEl.contains(target) || overlay?.contains(target)) return;
    scrollEl.scrollTop += event.deltaY;
  };
  return (
    <ShellSlots.Provider value={{ action, overlay }}>
      <div
        onWheel={handleShellWheel}
        className={`patient-app-shell patient-viewport-shell flex justify-center ${isStore ? 'patient-store-shell' : ''} ${isHome ? 'patient-home-shell' : ''} ${isStorefront ? 'patient-storefront-shell' : ''}`}
      >
        <div
          ref={frame}
          data-nav={String(!isProduct && !immersive)}
          className="patient-app-frame relative w-full max-w-[720px] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Screen content */}
          <div
            ref={content}
            className={`patient-shell-content min-h-0 flex-1 scrollbar-hide ${immersive ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            {children}
          </div>

          <div ref={footer} className="patient-shell-footer shrink-0">
            <div
              ref={setAction}
              className={`patient-action-slot ${isProduct ? 'patient-product-actions' : ''}`}
            />
            {!isProduct && !immersive && <BottomTabBar />}
          </div>
          <div ref={setOverlay} className="patient-shell-overlay" />
          <GlobalSheet />
        </div>
      </div>
    </ShellSlots.Provider>
  );
}

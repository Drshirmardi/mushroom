'use client';

import { useEffect, useRef, useState } from 'react';
import { ShellSlots } from './shell-slots';
import { usePathname } from 'next/navigation';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { useAuthSessionSnapshot } from '@/components/auth/session-gate';
import { GlobalSheet } from '@/components/shared/global-sheet';
import { useUiStore } from '@/stores/ui';

/**
 * Phone-sized app shell shared by all migrated routes: page headers,
 * scrollable content area, bottom tab bar and global sheet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useAuthSessionSnapshot();
  const isHome = pathname === '/';
  const isStorefront = pathname === '/store';
  const isStore = pathname === '/store' || pathname.startsWith('/store/');
  const isProfile = pathname === '/profile' || pathname.startsWith('/profile/');
  const isProduct = pathname.startsWith('/store/products/');
  const isDoctorProfile = /^\/doctors\/[^/]+\/?$/.test(pathname);
  const isAssessmentWizard =
    pathname === '/assessment/resume' ||
    (pathname.startsWith('/assessment/') &&
      pathname !== '/assessment/result' &&
      /^\/assessment\/[^/]+$/.test(pathname));
  const immersive = useUiStore((state) => state.immersive);
  const hasNavigation = !isProduct && !isDoctorProfile && !isAssessmentWizard && !immersive;
  const framed = session?.status === 'authenticated' || isStore;
  const showTabs = hasNavigation && framed;
  const [action, setAction] = useState<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!framed) return;
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
  }, [framed]);
  const handleShellWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (immersive || event.defaultPrevented || event.ctrlKey || ! event.deltaY) return;
    const scrollEl = content.current;
    const target = event.target;
    if (!scrollEl || !(target instanceof Node)) return;
    if (scrollEl.contains(target) || overlay?.contains(target)) return;
    scrollEl.scrollTop += event.deltaY;
  };
  if (session?.status !== 'authenticated' && !isStore) return children;
  return (
    <ShellSlots.Provider value={{ action, overlay }}>
      <div
        onWheel={handleShellWheel}
        className={`patient-app-shell patient-viewport-shell flex justify-center ${isStore ? 'patient-store-shell' : ''} ${isHome ? 'patient-home-shell' : ''} ${isStorefront ? 'patient-storefront-shell' : ''} ${isProfile ? 'patient-profile-shell' : ''} ${isDoctorProfile ? 'patient-doctor-profile-shell' : ''}`}
      >
        <div
          ref={frame}
          data-nav={String(hasNavigation)}
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
            {showTabs && <BottomTabBar />}
          </div>
          <div ref={setOverlay} className="patient-shell-overlay" />
          <GlobalSheet />
        </div>
      </div>
    </ShellSlots.Provider>
  );
}

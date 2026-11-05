'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackBrowserAction, trackBrowserPage } from '../../../../config/analytics-browser';

export function AnalyticsTracking() {
  const pathname = usePathname();
  useEffect(() => { trackBrowserPage(pathname, 'web'); }, [pathname]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics-action]') : null;
      if (target) trackBrowserAction(target.dataset.analyticsAction!, target.closest('section')?.id || 'header', 'web');
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  return null;
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { observeBrowserInteractions, trackBrowserPage } from '../../../../config/analytics-browser';

export function AnalyticsTracking() {
  const pathname = usePathname();
  useEffect(() => {
    trackBrowserPage(pathname, 'web');
    return observeBrowserInteractions(pathname, 'web');
  }, [pathname]);
  return null;
}

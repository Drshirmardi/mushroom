'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { observeBrowserInteractions, trackBrowserPage } from '../../../../config/analytics-browser';

export function AnalyticsTracking() {
  const pathname = usePathname();
  useEffect(() => {
    trackBrowserPage(pathname, 'app');
    return observeBrowserInteractions(pathname, 'app');
  }, [pathname]);
  return null;
}

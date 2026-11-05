'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackBrowserPage } from '../../../../config/analytics-browser';

export function AnalyticsTracking() {
  const pathname = usePathname();
  useEffect(() => { trackBrowserPage(pathname, 'app'); }, [pathname]);
  return null;
}

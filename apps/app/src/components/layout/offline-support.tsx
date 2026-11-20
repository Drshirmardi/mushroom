'use client';

import { useEffect } from 'react';

export function OfflineSupport() {
  useEffect(() => {
    let disposed = false;
    const showOffline = () => {
      if (navigator.onLine !== false || location.pathname === '/offline.html') return;
      const target = location.pathname + location.search + location.hash;
      location.replace('/offline.html?returnTo=' + encodeURIComponent(target));
    };
    // Wait for the fallback to be installed before navigating away from a live page.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (disposed) return;
          window.addEventListener('offline', showOffline);
          showOffline();
        }).catch(() => { /* Browser restrictions must not prevent using the app. */ });
    }
    return () => {
      disposed = true;
      window.removeEventListener('offline', showOffline);
    };
  }, []);
  return null;
}

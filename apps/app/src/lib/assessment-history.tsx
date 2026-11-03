'use client';

import { useEffect } from 'react';

const positionKey = '__assessmentPosition';
type Position = { documentId: string; index: number };
type Guard = { shouldBlock: () => boolean; onBlocked: (resume: () => void) => void };
type Restoration = { from: Position; to: Position };

function readPosition(state: unknown): Position | null {
  const value = (state as Record<string, unknown> | null)?.[positionKey] as Position | undefined;
  return value && typeof value.documentId === 'string' && Number.isSafeInteger(value.index) ? value : null;
}

/** Track existing entries; never add a sentinel or change Next's routing fields. */
function createTracker() {
  const documentId = crypto.randomUUID();
  let current: Position = { documentId, index: 0 };
  let guard: Guard | null = null;
  let restoring: Restoration | null = null;
  let allowed: Position | null = null;
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  const withPosition = (data: unknown, position: Position) => ({
    ...(data !== null && typeof data === 'object' ? data : {}),
    [positionKey]: position,
  });
  replace(withPosition(window.history.state, current), '');
  window.history.pushState = (data, unused, url) => {
    const next = { documentId, index: current.index + 1 };
    push(withPosition(data, next), unused, url);
    current = next;
  };
  window.history.replaceState = (data, unused, url) => {
    replace(withPosition(data, current), unused, url);
  };

  // Capture runs before Next's bubbling popstate listener, keeping the attempt mounted.
  window.addEventListener('popstate', event => {
    const destination = readPosition(event.state);
    if (!destination || destination.documentId !== documentId) {
      // A different document is protected by beforeunload. Rebase untracked entries
      // reached without an active guard (e.g. a restored page from an earlier load).
      current = { documentId, index: 0 };
      replace(withPosition(window.history.state, current), '');
      return;
    }
    if (restoring) {
      event.stopImmediatePropagation();
      if (destination.index !== restoring.from.index) {
        window.history.go(restoring.from.index - destination.index);
        return;
      }
      const { from, to } = restoring;
      restoring = null;
      current = from;
      guard?.onBlocked(() => {
        allowed = to;
        window.history.go(to.index - from.index);
      });
      return;
    }
    if (allowed?.index === destination.index) {
      allowed = null;
      current = destination;
      return;
    }
    allowed = null;
    if (guard?.shouldBlock() && destination.index !== current.index) {
      event.stopImmediatePropagation();
      restoring = { from: current, to: destination };
      window.history.go(current.index - destination.index);
      return;
    }
    current = destination;
  }, true);

  return {
    register(next: Guard) {
      guard = next;
      return () => { if (guard === next) guard = null; };
    },
  };
}

type Tracker = ReturnType<typeof createTracker>;
// Document-lifetime tracking must begin before entering an assessment. Only the
// mounted assessment registers a blocker; all other routes traverse normally.
const trackerKey = '__assessmentHistoryTracker';
function tracker(): Tracker {
  const host = window as typeof window & { [trackerKey]?: Tracker };
  return host[trackerKey] ??= createTracker();
}

export function registerAssessmentHistoryGuard(guard: Guard) {
  return tracker().register(guard);
}

export function AssessmentHistoryTracking() {
  useEffect(() => { tracker(); }, []);
  return null;
}

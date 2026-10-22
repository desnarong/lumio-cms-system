'use client';

import { useEffect } from 'react';
import type { PageviewInput } from '@lumio/shared';

const VISITOR_KEY = 'lumio:visitor';

/**
 * A random id kept for the browser tab, so repeat views in one visit count as a
 * single visitor without ever identifying the person. Falls back to `undefined`
 * when storage is blocked, and the API then uses a salted hash of the request.
 */
const visitorId = (): string | undefined => {
  try {
    const existing = window.sessionStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return undefined;
  }
};

export interface PageViewTrackerProps {
  /** Public path of the page being viewed, e.g. `/services`. */
  path: string;
}

/**
 * Sends one beacon per page view to the renderer's own `/api/track` route. It
 * renders nothing, so a page stays static HTML for crawlers and for anyone with
 * JavaScript disabled.
 */
export const PageViewTracker = ({ path }: PageViewTrackerProps) => {
  useEffect(() => {
    const payload: PageviewInput = { path };
    const visitor = visitorId();
    if (visitor) payload.visitorId = visitor;
    if (document.referrer) payload.referrer = document.referrer;

    try {
      const body = JSON.stringify(payload);
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        void fetch('/api/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          keepalive: true,
        });
      }
    } catch {
      // A failed beacon must never affect the visitor.
    }
  }, [path]);

  return null;
};

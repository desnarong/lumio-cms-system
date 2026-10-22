import { timingSafeEqual } from 'node:crypto';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PAGEVIEW_EDGE_TOKEN_HEADER } from '@lumio/shared';
import { ApiException } from './api-error';

/** Constant-time compare that also tolerates different lengths. */
export const edgeTokensMatch = (received: string, expected: string): boolean => {
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

/**
 * Guards the batched page-view endpoint used by a CDN edge or worker
 * (docs/design/14-seo-performance.md). The single beacon stays anonymous and
 * rate limited; batches carry a shared token so nobody can use the endpoint to
 * stuff a site's analytics with thousands of rows per request.
 *
 * No token configured means the endpoint is closed, not open: a deployment that
 * does not run an edge collector has no reason to accept batches.
 */
@Injectable()
export class EdgeCollectGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.EDGE_COLLECT_TOKEN?.trim() ?? '';
    if (!expected) {
      throw ApiException.forbidden('ระบบยังไม่ได้เปิดรับสถิติจาก edge');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers[PAGEVIEW_EDGE_TOKEN_HEADER];
    const received = Array.isArray(header) ? header[0] : header;
    if (typeof received !== 'string' || !edgeTokensMatch(received, expected)) {
      throw ApiException.forbidden('โทเคนของ edge ไม่ถูกต้อง');
    }
    return true;
  }
}

import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';
import { NotModifiedException } from '../../common/not-modified';

export interface PublicCacheOptions {
  /** Browser cache lifetime in seconds. */
  maxAge: number;
  /** Shared cache (CDN) lifetime in seconds. */
  sMaxAge: number;
  staleWhileRevalidate: number;
}

/**
 * Short, dependency-free hash so public responses get a stable ETag
 * (docs/design/12-api.md 12.7). Weak on purpose: it fingerprints the payload,
 * not the byte-for-byte body.
 */
const weakEtag = (payload: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `W/"${(hash >>> 0).toString(36)}-${payload.length.toString(36)}"`;
};

/**
 * Adds `Cache-Control` + `ETag` to a public route and answers `304` when the
 * caller already has that version. It runs before the global response
 * interceptor, so the fingerprint is taken from the handler's own payload.
 *
 * The 304 is raised as {@link NotModifiedException}: returning an empty stream
 * would leave Nest waiting for a value that never arrives, and returning the
 * payload would force the status back to 200. The exception filter then writes
 * the bare 304 (with the ETag still attached).
 */
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly options: PublicCacheOptions) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    // A reader's own view (full body of a members page) must never be cached
    // for the next visitor, so an authenticated read is answered as private.
    const authenticated = typeof request.headers.authorization === 'string';
    const cacheControl = [
      'public',
      `max-age=${this.options.maxAge}`,
      `s-maxage=${this.options.sMaxAge}`,
      `stale-while-revalidate=${this.options.staleWhileRevalidate}`,
    ].join(', ');

    return next.handle().pipe(
      map((value) => {
        if (authenticated) {
          response.setHeader('Cache-Control', 'private, no-store');
          return value;
        }

        const etag = weakEtag(JSON.stringify(value ?? null));
        response.setHeader('ETag', etag);
        response.setHeader('Cache-Control', cacheControl);

        const sent = request.headers['if-none-match'];
        const matches =
          typeof sent === 'string' &&
          sent
            .split(',')
            .map((candidate) => candidate.trim())
            .includes(etag);

        if (matches) throw new NotModifiedException();
        return value;
      }),
    );
  }
}

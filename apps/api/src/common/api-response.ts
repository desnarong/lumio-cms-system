import type { ApiMeta } from './response';

/**
 * Wraps a successful payload in the standard `{ data, meta }` envelope
 * (docs/design/12-api.md 12.4). Handlers that return it directly keep full
 * control over `meta` (e.g. pagination cursors); everything else is wrapped
 * automatically by ResponseInterceptor.
 */
export class ApiResponse<T> {
  constructor(
    readonly data: T,
    readonly meta?: ApiMeta,
  ) {}
}

export const ok = <T>(data: T, meta?: ApiMeta): ApiResponse<T> => new ApiResponse(data, meta);

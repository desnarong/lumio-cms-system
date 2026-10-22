import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { ApiResponse } from './api-response';
import type { ApiSuccess } from './response';

/**
 * Wraps every successful handler result in the standard `{ data, meta }`
 * envelope (docs/design/12-api.md 12.4). Handlers that need to set `meta`
 * themselves return an {@link ApiResponse}.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, ApiSuccess<unknown>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiSuccess<unknown>> {
    return next.handle().pipe(
      map((value): ApiSuccess<unknown> => {
        if (value instanceof ApiResponse) {
          return value.meta ? { data: value.data, meta: value.meta } : { data: value.data };
        }
        return { data: value };
      }),
    );
  }
}

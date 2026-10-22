import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from './api-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Origins allowed to send state-changing requests from a browser. The admin SPA
 * is the only browser client; the renderer and the worker talk to the API
 * server-to-server, which never sends an `Origin` header
 * (docs/design/15-security.md 15.2).
 */
export const resolveAllowedOrigins = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const raw = [env.ADMIN_ORIGIN ?? 'http://localhost:49300', env.RENDERER_ORIGIN, env.API_PUBLIC_URL]
    .flatMap((value) => (value ?? '').split(','))
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter((value) => value.length > 0);
  return [...new Set(raw)];
};

/**
 * Blocks cross-site state-changing requests (CSRF) by comparing the `Origin`
 * header against the configured allow-list. Requests without an `Origin`
 * header are non-browser clients (worker, renderer, curl) and are left alone.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed = resolveAllowedOrigins();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const origin = request.headers.origin;
    if (typeof origin !== 'string' || origin.length === 0) return true;
    if (this.allowed.includes(origin.replace(/\/+$/, ''))) return true;

    throw ApiException.forbidden('คำขอมาจากโดเมนที่ไม่อนุญาต');
  }
}

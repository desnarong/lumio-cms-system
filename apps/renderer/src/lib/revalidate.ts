import { createHash, timingSafeEqual } from 'node:crypto';

export type RevalidateDecision =
  | { ok: true; paths: string[]; host?: string }
  | { ok: false; reason: 'forbidden' | 'invalid' };

export interface RevalidateInput {
  /** Secret configured on the renderer (`REVALIDATE_SECRET`). */
  secret: string | undefined;
  /** Secret the API sent in `x-lumio-revalidate-secret`. */
  provided: string | null;
  body: unknown;
}

const MAX_PATHS = 100;
const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/;

/**
 * Constant-time secret comparison. Both sides are hashed first so the check
 * does not leak the secret's length (docs/design/15-security.md 15.2).
 */
const secretsMatch = (provided: string, expected: string): boolean => {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
};

/**
 * Validates a rebuild request from the publish pipeline
 * (docs/design/10-architecture.md 10.4). Only same-origin absolute paths are
 * accepted, so a leaked secret still cannot make the renderer fetch elsewhere.
 */
export const decideRevalidate = (input: RevalidateInput): RevalidateDecision => {
  if (!input.secret || !input.provided || !secretsMatch(input.provided, input.secret)) {
    return { ok: false, reason: 'forbidden' };
  }

  const body = input.body as { paths?: unknown; host?: unknown } | null | undefined;
  const raw = Array.isArray(body?.paths) ? body.paths : [];
  const paths = raw.filter(
    (path): path is string => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//'),
  );

  if (paths.length === 0) return { ok: false, reason: 'invalid' };
  const host =
    typeof body?.host === 'string' && HOST_PATTERN.test(body.host.toLowerCase())
      ? body.host.toLowerCase()
      : null;
  return {
    ok: true,
    paths: [...new Set(paths)].slice(0, MAX_PATHS),
    ...(host ? { host } : {}),
  };
};

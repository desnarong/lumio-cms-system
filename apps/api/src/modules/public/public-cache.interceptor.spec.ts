import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NotModifiedException } from '../../common/not-modified';
import { PublicCacheInterceptor } from './public-cache.interceptor';

interface FakeResponse {
  headers: Record<string, string>;
  statusCode: number;
  ended: boolean;
  setHeader(key: string, value: string): void;
  status(code: number): FakeResponse;
  end(): void;
}

const harness = (requestHeaders: Record<string, string> = {}) => {
  const response: FakeResponse = {
    headers: {},
    statusCode: 200,
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.ended = true;
    },
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: requestHeaders }),
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  const next = (value: unknown): CallHandler => ({ handle: () => of(value) });
  return { context, next, response };
};

const interceptor = (): PublicCacheInterceptor =>
  new PublicCacheInterceptor({ maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 600 });

const collect = async (context: ExecutionContext, next: CallHandler): Promise<unknown[]> =>
  firstValueFrom(interceptor().intercept(context, next).pipe(toArray()));

/** The 304 path raises an exception; capture it instead of letting it escape. */
const collectOrThrow = async (
  context: ExecutionContext,
  next: CallHandler,
): Promise<{ emitted: unknown[]; error: unknown }> => {
  try {
    return { emitted: await collect(context, next), error: null };
  } catch (error) {
    return { emitted: [], error };
  }
};

describe('PublicCacheInterceptor', () => {
  it('sets a shared cache policy and a weak ETag', async () => {
    const { context, next, response } = harness();

    const emitted = await collect(context, next({ data: { title: 'หน้าแรก' } }));

    expect(emitted).toEqual([{ data: { title: 'หน้าแรก' } }]);
    expect(response.headers['Cache-Control']).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    );
    expect(response.headers.ETag).toMatch(/^W\/"/);
  });

  it('gives the same ETag to the same payload and a different one when it changes', async () => {
    const first = harness();
    await collect(first.context, first.next({ data: { title: 'หน้าแรก' } }));

    const same = harness();
    await collect(same.context, same.next({ data: { title: 'หน้าแรก' } }));

    const changed = harness();
    await collect(changed.context, changed.next({ data: { title: 'แก้แล้ว' } }));

    expect(same.response.headers.ETag).toBe(first.response.headers.ETag);
    expect(changed.response.headers.ETag).not.toBe(first.response.headers.ETag);
  });

  it('answers 304 with no body when the client already has that version', async () => {
    const warm = harness();
    await collect(warm.context, warm.next({ data: { title: 'หน้าแรก' } }));
    const etag = warm.response.headers.ETag ?? '';

    const { context, next, response } = harness({ 'if-none-match': etag });
    const { emitted, error } = await collectOrThrow(context, next({ data: { title: 'หน้าแรก' } }));

    expect(emitted).toEqual([]);
    expect(error).toBeInstanceOf(NotModifiedException);
    // The fingerprint stays on the response so a cache can still validate it.
    expect(response.headers.ETag).toBe(etag);
    expect(response.statusCode).toBe(200);
  });

  it('serves the body when the client has a stale ETag', async () => {
    const { context, next, response } = harness({ 'if-none-match': 'W/"old"' });

    const emitted = await collect(context, next({ data: { title: 'หน้าแรก' } }));

    expect(emitted).toHaveLength(1);
    expect(response.statusCode).toBe(200);
    expect(response.ended).toBe(false);
  });
});

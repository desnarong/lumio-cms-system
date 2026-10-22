import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ApiException } from './api-error';
import { ok } from './api-response';
import { ResponseInterceptor } from './response.interceptor';

const context = {} as ExecutionContext;
const handle = (value: unknown): CallHandler<unknown> => ({ handle: () => of(value) });

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  it('wraps a plain payload in the data envelope', async () => {
    await expect(
      firstValueFrom(interceptor.intercept(context, handle({ status: 'ok' }))),
    ).resolves.toEqual({ data: { status: 'ok' } });
  });

  it('keeps meta from an explicit ApiResponse', async () => {
    await expect(
      firstValueFrom(interceptor.intercept(context, handle(ok([1, 2], { cursor: 'c1' })))),
    ).resolves.toEqual({ data: [1, 2], meta: { cursor: 'c1' } });
  });

  it('omits meta when an ApiResponse has none', async () => {
    await expect(
      firstValueFrom(interceptor.intercept(context, handle(ok({ id: 'x' })))),
    ).resolves.toEqual({ data: { id: 'x' } });
  });
});

describe('ApiException', () => {
  it('carries the machine-readable code and a Thai message', () => {
    const error = ApiException.forbidden();

    expect(error.code).toBe('forbidden');
    expect(error.getStatus()).toBe(403);
    expect((error.getResponse() as { message: string }).message).toBe('คุณไม่มีสิทธิ์ทำรายการนี้');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { EdgeCollectGuard, edgeTokensMatch } from './edge-collect.guard';

const context = (headers: Record<string, string | undefined>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

const original = process.env.EDGE_COLLECT_TOKEN;
afterEach(() => {
  if (original === undefined) delete process.env.EDGE_COLLECT_TOKEN;
  else process.env.EDGE_COLLECT_TOKEN = original;
});

describe('EdgeCollectGuard', () => {
  it('closes the endpoint when no token is configured', () => {
    delete process.env.EDGE_COLLECT_TOKEN;
    expect(() => new EdgeCollectGuard().canActivate(context({}))).toThrow(/ยังไม่ได้เปิดรับ/);
  });

  it('accepts the shared token and rejects anything else', () => {
    process.env.EDGE_COLLECT_TOKEN = 'edge-secret';
    const guard = new EdgeCollectGuard();

    expect(guard.canActivate(context({ 'x-lumio-edge-token': 'edge-secret' }))).toBe(true);
    expect(() => guard.canActivate(context({ 'x-lumio-edge-token': 'wrong' }))).toThrow(
      /โทเคน/,
    );
    expect(() => guard.canActivate(context({}))).toThrow(/โทเคน/);
  });

  it('compares tokens without leaking the length through timing', () => {
    expect(edgeTokensMatch('abc', 'abc')).toBe(true);
    expect(edgeTokensMatch('abc', 'abcd')).toBe(false);
  });
});

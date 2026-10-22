import { describe, expect, it, vi } from 'vitest';
import { createRequestId, isBridgeResponse, type BridgeRequest } from './bridge.js';
import { answerBridgeRequest, createBridgeHost } from './client.js';
import { defineApp } from './manifest.js';
import { hasScope } from './permissions.js';

describe('permissions', () => {
  it('grants only declared scopes', () => {
    expect(hasScope(['contents:read'], 'contents:read')).toBe(true);
    expect(hasScope(['contents:read'], 'email:send')).toBe(false);
  });
});

describe('manifest', () => {
  it('accepts a valid manifest and fills defaults', () => {
    const app = defineApp({ key: 'booking', name: 'ระบบจองคิว', version: '1.2.0' });
    expect(app.permissions).toEqual([]);
    expect(app.adminPages).toEqual([]);
  });

  it('rejects unknown permission scopes', () => {
    expect(() =>
      defineApp({
        key: 'booking',
        name: 'ระบบจองคิว',
        version: '1.0.0',
        // @ts-expect-error unknown scope must fail validation
        permissions: ['database:root'],
      }),
    ).toThrow();
  });

  it('rejects a non-semver version', () => {
    expect(() => defineApp({ key: 'booking', name: 'x', version: 'v1' })).toThrow();
  });
});

describe('bridge', () => {
  it('creates unique request ids', () => {
    expect(createRequestId()).not.toBe(createRequestId());
  });

  it('recognises bridge responses', () => {
    expect(isBridgeResponse({ id: 'a', ok: true })).toBe(true);
    expect(isBridgeResponse({ id: 'a' })).toBe(false);
    expect(isBridgeResponse(null)).toBe(false);
  });
});

describe('answerBridgeRequest', () => {
  it('ignores anything that is not a bridge request', async () => {
    expect(await answerBridgeRequest(null, async () => 1)).toBeNull();
    expect(await answerBridgeRequest({ method: 'x' }, async () => 1)).toBeNull();
  });

  it('runs the call and reports the result', async () => {
    const onCall = vi.fn(async (request: BridgeRequest) => ({ method: request.method }));
    const response = await answerBridgeRequest({ id: 'r1', method: 'contents.list' }, onCall);

    expect(onCall).toHaveBeenCalledWith({ id: 'r1', method: 'contents.list' });
    expect(response).toEqual({ id: 'r1', ok: true, result: { method: 'contents.list' } });
  });

  it('reports a refusal as an error response', async () => {
    const response = await answerBridgeRequest({ id: 'r2', method: 'forms.list' }, async () => {
      throw new Error('App นี้ไม่ได้รับสิทธิ์สำหรับคำสั่งนี้');
    });

    expect(response).toEqual({
      id: 'r2',
      ok: false,
      error: 'App นี้ไม่ได้รับสิทธิ์สำหรับคำสั่งนี้',
    });
  });
});

describe('createBridgeHost', () => {
  it('ignores messages that do not come from the App frame', async () => {
    const frame = { postMessage: vi.fn() } as unknown as Window;
    const host = createBridgeHost({ frame: () => frame, onCall: async () => 1 });

    host.handleMessage({ source: {} as Window, data: { id: 'r1', method: 'contents.list' } } as MessageEvent);
    await Promise.resolve();

    expect(frame.postMessage).not.toHaveBeenCalled();
  });

  it('answers a call from the App frame', async () => {
    const frame = { postMessage: vi.fn() } as unknown as Window;
    const host = createBridgeHost({ frame: () => frame, onCall: async () => ({ items: [] }) });

    host.handleMessage({
      source: frame,
      data: { id: 'r1', method: 'contents.list' },
    } as unknown as MessageEvent);
    await Promise.resolve();
    await Promise.resolve();

    expect(frame.postMessage).toHaveBeenCalledWith(
      { id: 'r1', ok: true, result: { items: [] } },
      '*',
    );
  });
});

describe('manifest for a developer-hosted App', () => {
  it('carries the store text and admin entry the API needs', () => {
    const app = defineApp({
      key: 'booking-widget',
      name: 'Booking widget',
      version: '1.0.0',
      description: 'Takes bookings on the site',
      category: 'content',
      entry: 'admin/index.html',
      permissions: ['contents:read'],
    });

    expect(app.entry).toBe('admin/index.html');
    expect(app.description).toBe('Takes bookings on the site');
  });
});

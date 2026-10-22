import { describe, expect, it, vi } from 'vitest';
import { createHttpDashboardApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>) =>
  createHttpDashboardApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    getSiteId: () => 'site-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

describe('createHttpDashboardApi', () => {
  it('reads the summary with the site header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { site: { id: 's1' } } }));

    const summary = await buildApi(fetchImpl).getSummary();

    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('http://api.test/api/v1/dashboard');
    expect(init.headers['x-site-id']).toBe('site-1');
    expect(init.headers.authorization).toBe('Bearer token-1');
    expect(summary).toEqual({ site: { id: 's1' } });
  });

  it('hides the checklist with a PATCH', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { dismissed: true } }));

    await buildApi(fetchImpl).setChecklistDismissed(true);

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/dashboard/checklist');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ dismissed: true });
  });

  it('turns an error envelope into a human message', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'forbidden', message: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, 403));

    await expect(buildApi(fetchImpl).getSummary()).rejects.toMatchObject({
      code: 'forbidden',
      message: 'คุณไม่มีสิทธิ์ทำรายการนี้',
    });
  });
});

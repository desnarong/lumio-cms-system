import { describe, expect, it, vi } from 'vitest';
import { createHttpUpdatesApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>) =>
  createHttpUpdatesApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

describe('createHttpUpdatesApi', () => {
  it('reads the status and asks for a fresh check', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { currentVersion: '0.23.1' } }));
    const api = buildApi(fetchImpl);

    await api.status();
    await api.check();

    const calls = fetchImpl.mock.calls as [
      string,
      { method: string; headers: Record<string, string> },
    ][];
    expect(calls[0]![0]).toBe('http://api.test/api/v1/updates');
    expect(calls[0]![1].method).toBe('GET');
    expect(calls[1]![0]).toBe('http://api.test/api/v1/updates/check');
    expect(calls[1]![1].method).toBe('POST');
    expect(calls[0]![1].headers.authorization).toBe('Bearer token-1');
  });
});

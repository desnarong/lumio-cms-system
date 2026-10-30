import { describe, expect, it, vi } from 'vitest';
import { createDemoApiKeysApi, createHttpApiKeysApi } from './api-keys.js';

const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 });

describe('demo api keys', () => {
  it('returns the secret once and keeps only the hint afterwards', async () => {
    const api = createDemoApiKeysApi();

    const created = await api.create({ name: 'มือถือ', scopes: ['content:read'] });
    const listed = await api.list();

    expect(created.secret.startsWith('lum_')).toBe(true);
    expect(listed.every((key) => !('secret' in key))).toBe(true);
    expect(listed.some((key) => key.name === 'มือถือ')).toBe(true);
  });

  it('marks a revoked key instead of dropping it', async () => {
    const api = createDemoApiKeysApi();
    const [first] = await api.list();

    const revoked = await api.revoke(first?.id ?? '');

    expect(revoked.revokedAt).not.toBeNull();
  });
});

describe('http api keys', () => {
  it('sends the access token and site header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ data: { items: [] } }));
    const api = createHttpApiKeysApi({
      baseUrl: 'https://api.example.com',
      getAccessToken: () => 'token-1',
      getSiteId: () => 'site-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await api.list();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/api-keys',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token-1',
          'x-site-id': 'site-1',
        }),
      }),
    );
  });

  it('surfaces the API message on a refusal', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'forbidden', message: 'ไม่มีสิทธิ์' }), { status: 403 }),
    );
    const api = createHttpApiKeysApi({
      baseUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(api.create({ name: 'x', scopes: ['content:read'] })).rejects.toMatchObject({
      message: 'ไม่มีสิทธิ์',
      status: 403,
    });
  });
});

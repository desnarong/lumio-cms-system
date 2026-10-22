import { describe, expect, it, vi } from 'vitest';
import { reportNotFound } from './not-found.js';

describe('reportNotFound', () => {
  it('posts the path for the current host without blocking rendering', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      reportNotFound('baandoi.example.com', '/promo-2025', {
        baseUrl: 'http://api.test/',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/v1/public/baandoi.example.com/not-found',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: '/promo-2025' }),
      }),
    );
  });

  it('stays quiet when no API is configured or the call fails', async () => {
    await expect(reportNotFound('shop.test', '/x', { baseUrl: '' })).resolves.toBe(false);
    await expect(
      reportNotFound('shop.test', '/x', {
        baseUrl: 'http://api.test',
        fetchImpl: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
      }),
    ).resolves.toBe(false);
  });
});

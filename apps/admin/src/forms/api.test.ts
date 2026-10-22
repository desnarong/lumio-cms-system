import { describe, expect, it, vi } from 'vitest';
import { createHttpFormsApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>) =>
  createHttpFormsApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    getSiteId: () => 'site-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

describe('createHttpFormsApi', () => {
  it('lists forms with the site header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'f1' }] }));

    const forms = await buildApi(fetchImpl).list();

    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('http://api.test/api/v1/forms');
    expect(init.headers['x-site-id']).toBe('site-1');
    expect(init.headers.authorization).toBe('Bearer token-1');
    expect(forms).toEqual([{ id: 'f1' }]);
  });

  it('creates a form with a POST body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'f1' } }));

    await buildApi(fetchImpl).create({
      name: 'ติดต่อเรา',
      fields: [
        { id: 'a', name: 'name', label: 'ชื่อ', type: 'text', required: true, options: [] },
      ],
      notify: { emails: [] },
      successMessage: 'ขอบคุณ',
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/forms');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ name: 'ติดต่อเรา' });
  });

  it('reads a page of submissions with the cursor from meta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ id: 'sub-1' }], meta: { cursor: 'sub-1' } }),
    );

    const page = await buildApi(fetchImpl).listSubmissions('f1', { status: 'new', limit: 10 });

    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toBe('http://api.test/api/v1/forms/f1/submissions?status=new&limit=10');
    expect(page).toEqual({ items: [{ id: 'sub-1' }], cursor: 'sub-1' });
  });

  it('marks a submission as read with a PATCH', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'sub-1' } }));

    await buildApi(fetchImpl).updateSubmission('f1', 'sub-1', { status: 'read' });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/forms/f1/submissions/sub-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'read' });
  });

  it('turns an error envelope into a human message', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'not_found', message: 'ไม่พบฟอร์มนี้' }, 404));

    await expect(buildApi(fetchImpl).get('f1')).rejects.toMatchObject({
      code: 'not_found',
      message: 'ไม่พบฟอร์มนี้',
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { submitForm } = vi.hoisted(() => ({ submitForm: vi.fn() }));

vi.mock('./content', () => ({ submitForm }));
vi.mock('./request-host', () => ({
  requestHost: async () => 'baandoi.lumio.app',
}));

import { handleFormSubmit } from './form-submit';

const post = (fields: Record<string, string>, referer = 'http://baandoi.lumio.app/contact') => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request('http://baandoi.lumio.app/forms/f1', {
    method: 'POST',
    body,
    headers: { referer },
  });
};

const location = (response: Response): string => response.headers.get('location') ?? '';

describe('handleFormSubmit', () => {
  beforeEach(() => {
    submitForm.mockReset();
    submitForm.mockResolvedValue({ ok: true });
  });

  it('forwards the answers and sends the visitor back with a thank-you anchor', async () => {
    const response = await handleFormSubmit(post({ name: 'สมชาย', message: 'สนใจกาแฟ' }), 'f1');

    expect(response.status).toBe(303);
    expect(location(response)).toBe('http://baandoi.lumio.app/contact#sent-f1');
    expect(submitForm).toHaveBeenCalledWith('baandoi.lumio.app', 'f1', {
      data: { name: 'สมชาย', message: 'สนใจกาแฟ' },
      honeypot: '',
    });
  });

  it('passes the honeypot through instead of storing it as an answer', async () => {
    await handleFormSubmit(post({ name: 'บอท', _hp: 'http://spam.example' }), 'f1');

    expect(submitForm).toHaveBeenCalledWith('baandoi.lumio.app', 'f1', {
      data: { name: 'บอท' },
      honeypot: 'http://spam.example',
    });
  });

  it('shows the error notice when the API refuses the message', async () => {
    submitForm.mockRejectedValue(new Error('offline'));

    const response = await handleFormSubmit(post({ name: 'สมชาย' }), 'f1');

    expect(response.status).toBe(303);
    expect(location(response)).toBe('http://baandoi.lumio.app/contact#error-f1');
  });

  it('never redirects off-site when the referer is foreign', async () => {
    const response = await handleFormSubmit(
      post({ name: 'สมชาย' }, 'https://evil.example.com/phish'),
      'f1',
    );

    expect(location(response)).toBe('http://baandoi.lumio.app/#sent-f1');
  });
});

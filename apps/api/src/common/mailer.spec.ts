import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mailer } from './mailer';

const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;

afterEach(() => {
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = originalFrom;
  vi.restoreAllMocks();
});

describe('Mailer', () => {
  it('logs instead of sending when no key is configured', async () => {
    delete process.env.RESEND_API_KEY;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sent = await new Mailer().send({ to: 'a@example.com', subject: 'Hi', text: 'Body' });

    expect(sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts a plain-text message to Resend with the configured sender', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'Lumio <shop@lumio.app>';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }));

    const sent = await new Mailer().send({
      to: 'buyer@example.com',
      subject: 'คำสั่งซื้อ',
      text: 'ขอบคุณ',
    });

    expect(sent).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    const body = JSON.parse(String((init as RequestInit).body)) as {
      from: string;
      to: string[];
      text: string;
    };
    expect(body.from).toBe('Lumio <shop@lumio.app>');
    expect(body.to).toEqual(['buyer@example.com']);
    expect(body.text).toBe('ขอบคุณ');
  });

  it('reports a provider failure without throwing', async () => {
    process.env.RESEND_API_KEY = 're_test';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(
      new Mailer().send({ to: 'a@example.com', subject: 'Hi', text: 'Body' }),
    ).resolves.toBe(false);
  });
});

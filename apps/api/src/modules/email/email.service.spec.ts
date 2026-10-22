import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { readStoredEmailSettings, type EmailSettingsInput } from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import type { DeliveryResult, OutgoingEmail } from './email.delivery';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

interface Stubs {
  db: PrismaService;
  audit: AuditService;
  auditLog: Mock;
  mailerSend: Mock;
  deliver: Mock;
  settings: () => Record<string, unknown>;
}

const stubs = (initial: Record<string, unknown> = {}): Stubs => {
  let settings = initial;
  const auditLog = vi.fn().mockResolvedValue(undefined);
  const mailerSend = vi.fn().mockResolvedValue(true);
  const deliver = vi.fn().mockResolvedValue({ sent: true, error: null } satisfies DeliveryResult);

  const tx = {
    site: {
      findUnique: async () => ({ settings }),
      update: async ({ data }: { data: { settings: Record<string, unknown> } }) => {
        settings = data.settings;
        return { settings };
      },
    },
  };

  const db = {
    forSite: async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx),
  } as unknown as PrismaService;

  return {
    db,
    audit: { log: auditLog } as unknown as AuditService,
    auditLog,
    mailerSend,
    deliver,
    settings: () => settings,
  };
};

const service = (all: Stubs): EmailService =>
  new EmailService(
    all.db,
    all.audit,
    { configured: () => false, send: all.mailerSend } as never,
    all.deliver,
  );

const smtpInput = (overrides: Partial<EmailSettingsInput> = {}): EmailSettingsInput => ({
  enabled: true,
  provider: 'smtp',
  fromName: 'กาแฟบ้านดอย',
  fromEmail: 'hello@baandoi.com',
  notifyEmails: ['owner@baandoi.com'],
  smtp: {
    host: 'smtp.baandoi.com',
    port: 465,
    secure: true,
    username: 'hello@baandoi.com',
    password: 'app-password',
  },
  ...overrides,
});

describe('EmailService', () => {
  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = 'test-key-for-site-email';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports an unconfigured site without leaking any secret', async () => {
    const all = stubs();
    const view = await service(all).view(SITE_ID);

    expect(view).toMatchObject({
      enabled: true,
      provider: 'smtp',
      fromEmail: '',
      notifyEmails: [],
      ready: false,
      platformReady: false,
      updatedAt: null,
    });
    expect(view.smtp.hasPassword).toBe(false);
    expect(JSON.stringify(view)).not.toContain('enc:v1:');
  });

  it('encrypts the SMTP password at rest and only returns a flag', async () => {
    const all = stubs();
    const view = await service(all).update(SITE_ID, smtpInput(), USER_ID);

    const stored = readStoredEmailSettings(all.settings());
    expect(stored?.smtp?.password).toMatch(/^enc:v1:/);
    expect(stored?.smtp?.password).not.toContain('app-password');
    expect(view.ready).toBe(true);
    expect(view.smtp.hasPassword).toBe(true);
    expect(JSON.stringify(view)).not.toContain('app-password');
    expect(all.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email.settings.update', siteId: SITE_ID }),
    );
  });

  it('keeps the stored password when the field is left empty', async () => {
    const all = stubs();
    const email = service(all);
    await email.update(SITE_ID, smtpInput(), USER_ID);

    await email.update(
      SITE_ID,
      smtpInput({ smtp: { ...smtpInput().smtp!, password: undefined } }),
      USER_ID,
    );

    const stored = readStoredEmailSettings(all.settings());
    expect(stored?.smtp?.password).toMatch(/^enc:v1:/);
  });

  it('refuses to enable SMTP without a password', async () => {
    const all = stubs();
    await expect(
      service(all).update(
        SITE_ID,
        smtpInput({ smtp: { ...smtpInput().smtp!, password: undefined } }),
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('sends a real test message through the saved provider', async () => {
    const all = stubs();
    const email = service(all);
    await email.update(SITE_ID, smtpInput(), USER_ID);

    const result = await email.test(SITE_ID, 'owner@baandoi.com', USER_ID);

    expect(result.sent).toBe(true);
    expect(all.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'smtp',
        fromEmail: 'hello@baandoi.com',
        smtp: expect.objectContaining({ host: 'smtp.baandoi.com', password: 'app-password' }),
      }),
      expect.objectContaining({ to: 'owner@baandoi.com' }),
    );
    expect(all.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email.test', meta: expect.objectContaining({ sent: true }) }),
    );
  });

  it('uses the site mailbox for form messages', async () => {
    const all = stubs();
    const email = service(all);
    await email.update(SITE_ID, smtpInput(), USER_ID);

    const sent = await email.sendForSite(SITE_ID, {
      to: 'owner@baandoi.com',
      subject: 'มีข้อความใหม่',
      text: 'สวัสดี',
    });

    expect(sent).toBe(true);
    expect(all.deliver).toHaveBeenCalledTimes(1);
    expect(all.mailerSend).not.toHaveBeenCalled();
  });

  it('falls back to the platform sender when the site has no settings', async () => {
    const all = stubs();
    const message: OutgoingEmail = { to: 'owner@baandoi.com', subject: 'ใหม่', text: 'ข้อความ' };

    const sent = await service(all).sendForSite(SITE_ID, message);

    expect(sent).toBe(true);
    expect(all.mailerSend).toHaveBeenCalledWith(message);
    expect(all.deliver).not.toHaveBeenCalled();
  });

  it('stays quiet when the owner turned notifications off', async () => {
    const all = stubs();
    const email = service(all);
    await email.update(SITE_ID, smtpInput({ enabled: false }), USER_ID);

    const sent = await email.sendForSite(SITE_ID, {
      to: 'owner@baandoi.com',
      subject: 'ใหม่',
      text: 'ข้อความ',
    });

    expect(sent).toBe(false);
    expect(all.deliver).not.toHaveBeenCalled();
    expect(all.mailerSend).not.toHaveBeenCalled();
  });

  it('returns the site default recipients for forms without their own', async () => {
    const all = stubs();
    const email = service(all);
    await email.update(SITE_ID, smtpInput(), USER_ID);

    expect(await email.notifyEmails(SITE_ID)).toEqual(['owner@baandoi.com']);
  });
});

describe('deliverEmail', () => {
  it('posts to Resend with the site sender and replies to the visitor', async () => {
    const { deliverEmail } = await import('./email.delivery');
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const result = await deliverEmail(
      { provider: 'resend', fromName: 'ร้าน', fromEmail: 'shop@example.com', resend: { apiKey: 're_1' } },
      { to: 'owner@example.com', subject: 'ใหม่', text: 'ข้อความ', replyTo: 'customer@example.com' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result).toEqual({ sent: true, error: null });
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ authorization: 'Bearer re_1' });
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: 'ร้าน <shop@example.com>',
      to: ['owner@example.com'],
      reply_to: 'customer@example.com',
    });
  });

  it('sends through SMTP without throwing on failure', async () => {
    const { deliverEmail } = await import('./email.delivery');
    const sendMail = vi.fn().mockRejectedValue(new Error('connection refused'));
    const result = await deliverEmail(
      {
        provider: 'smtp',
        fromName: '',
        fromEmail: 'shop@example.com',
        smtp: { host: 'smtp.example.com', port: 465, secure: true, username: 'u', password: 'p' },
      },
      { to: 'owner@example.com', subject: 'ใหม่', text: 'ข้อความ' },
      { smtpTransport: () => ({ sendMail }) },
    );

    expect(result.sent).toBe(false);
    expect(result.error).toContain('connection refused');
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'shop@example.com', to: 'owner@example.com' }),
    );
  });

  it('reports a missing key instead of calling the provider', async () => {
    const { deliverEmail } = await import('./email.delivery');
    const result = await deliverEmail(
      { provider: 'resend', fromName: '', fromEmail: 'shop@example.com', resend: { apiKey: '' } },
      { to: 'owner@example.com', subject: 'ใหม่', text: 'ข้อความ' },
    );
    expect(result).toEqual({ sent: false, error: 'ยังไม่ได้ตั้งค่าคีย์ Resend' });
  });
});


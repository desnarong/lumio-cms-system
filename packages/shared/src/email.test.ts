import { describe, expect, it } from 'vitest';
import {
  emailSetupProblem,
  emailSettingsInputSchema,
  readStoredEmailSettings,
} from './email.js';

const valid = {
  enabled: true,
  provider: 'smtp' as const,
  fromName: 'ร้านกาแฟ',
  fromEmail: 'hello@example.com',
  notifyEmails: ['owner@example.com'],
  smtp: { host: 'smtp.example.com', port: 465, secure: true, username: 'hello@example.com', password: 'x' },
};

describe('emailSettingsInputSchema', () => {
  it('accepts a complete SMTP setup', () => {
    expect(emailSettingsInputSchema.safeParse(valid).success).toBe(true);
  });

  it('requires the SMTP block when SMTP is selected', () => {
    const result = emailSettingsInputSchema.safeParse({ ...valid, smtp: undefined });
    expect(result.success).toBe(false);
  });

  it('accepts Resend without repeating a saved key', () => {
    expect(
      emailSettingsInputSchema.safeParse({ ...valid, provider: 'resend', resend: {} }).success,
    ).toBe(true);
  });

  it('rejects a header-injection attempt in the sender name', () => {
    expect(
      emailSettingsInputSchema.safeParse({ ...valid, fromName: 'x\r\nBcc: evil@example.com' }).success,
    ).toBe(false);
  });

  it('rejects more than five recipients', () => {
    expect(
      emailSettingsInputSchema.safeParse({
        ...valid,
        notifyEmails: Array.from({ length: 6 }, (_, index) => `a${index}@example.com`),
      }).success,
    ).toBe(false);
  });


  it('refuses an internal mail server address', () => {
    for (const host of ['localhost', '127.0.0.1', '10.0.0.5', 'mail.internal']) {
      expect(
        emailSettingsInputSchema.safeParse({
          ...valid,
          smtp: { ...valid.smtp, host },
        }).success,
      ).toBe(false);
    }
  });

  it('rejects a server name with a scheme', () => {
    expect(
      emailSettingsInputSchema.safeParse({
        ...valid,
        smtp: { ...valid.smtp, host: 'https://smtp.example.com' },
      }).success,
    ).toBe(false);
  });
});

describe('readStoredEmailSettings', () => {
  it('reads the settings blob and ignores a broken one', () => {
    const stored = {
      enabled: true,
      provider: 'resend',
      fromName: '',
      fromEmail: 'a@example.com',
      notifyEmails: [],
      resend: { apiKey: 'enc:v1:x.y.z' },
      updatedAt: '2026-10-22T00:00:00.000Z',
    };
    expect(readStoredEmailSettings({ email: stored })?.provider).toBe('resend');
    expect(readStoredEmailSettings({ email: { provider: 'carrier-pigeon' } })).toBeNull();
    expect(readStoredEmailSettings({})).toBeNull();
  });
});

describe('emailSetupProblem', () => {
  it('explains what is missing before a site can send', () => {
    expect(emailSetupProblem({ provider: 'smtp', smtp: { ...valid.smtp, host: '' } }, true, false)).toContain(
      'เซิร์ฟเวอร์',
    );
    expect(emailSetupProblem({ provider: 'smtp', smtp: valid.smtp }, false, false)).toContain('รหัสผ่าน');
    expect(emailSetupProblem({ provider: 'resend', resend: {} }, false, false)).toContain('Resend');
    expect(emailSetupProblem({ provider: 'resend', resend: {} }, false, true)).toBeNull();
  });
});

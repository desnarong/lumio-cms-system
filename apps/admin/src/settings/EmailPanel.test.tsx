import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { EmailSettingsInput, EmailSettingsView } from '@lumio/shared';
import { EmailView, parseRecipients } from './EmailPanel.js';
import { MessagesProvider } from '@lumio/ui';

const settings: EmailSettingsView = {
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
    hasPassword: true,
  },
  resend: { hasApiKey: false },
  platformReady: false,
  ready: true,
  updatedAt: '2026-10-22T00:00:00.000Z',
};

const draft: EmailSettingsInput = {
  enabled: true,
  provider: 'smtp',
  fromName: 'กาแฟบ้านดอย',
  fromEmail: 'hello@baandoi.com',
  notifyEmails: ['owner@baandoi.com'],
  smtp: { host: 'smtp.baandoi.com', port: 465, secure: true, username: 'hello@baandoi.com' },
};

const props = (overrides: Partial<Parameters<typeof EmailView>[0]> = {}) => ({
  settings,
  draft,
  password: '',
  apiKey: '',
  recipients: 'owner@baandoi.com',
  testTo: 'owner@baandoi.com',
  saving: false,
  testing: false,
  error: null,
  testMessage: null,
  onDraftChange: vi.fn(),
  onPasswordChange: vi.fn(),
  onApiKeyChange: vi.fn(),
  onRecipientsChange: vi.fn(),
  onTestToChange: vi.fn(),
  onSave: vi.fn(),
  onTest: vi.fn(),
  ...overrides,
});

const render = (overrides: Partial<Parameters<typeof EmailView>[0]> = {}) =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <EmailView {...props(overrides)} />
    </MessagesProvider>,
  );

describe('EmailView', () => {
  it('shows the SMTP fields and that the password is already stored', () => {
    const html = render();
    expect(html).toContain('เซิร์ฟเวอร์อีเมล');
    expect(html).toContain('smtp.baandoi.com');
    expect(html).toContain('บันทึกไว้แล้ว');
    expect(html).toContain('อีเมลพร้อมใช้งาน');
  });

  it('shows the Resend key field and explains the platform fallback', () => {
    const html = render({
      settings: { ...settings, provider: 'resend', ready: false, platformReady: true },
      draft: { ...draft, provider: 'resend', smtp: undefined, resend: {} },
    });
    expect(html).toContain('คีย์ Resend');
    expect(html).toContain('ผู้ส่งกลางของ Lumio');
  });

  it('shows a save error and the test result', () => {
    const html = render({ error: 'กรอกรหัสผ่านอีเมลด้วย', testMessage: 'ส่งอีเมลทดสอบแล้ว' });
    expect(html).toContain('กรอกรหัสผ่านอีเมลด้วย');
    expect(html).toContain('ส่งอีเมลทดสอบแล้ว');
  });
});

describe('parseRecipients', () => {
  it('splits comma or newline lists, trims and caps at five', () => {
    expect(parseRecipients('a@example.com, b@example.com\nc@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
    expect(
      parseRecipients(
        Array.from({ length: 8 }, (_, index) => `a${index}@example.com`).join(','),
      ),
    ).toHaveLength(5);
  });
});

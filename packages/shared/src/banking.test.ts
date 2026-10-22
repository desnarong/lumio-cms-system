import { describe, expect, it } from 'vitest';
import {
  bankCredentialsReady,
  bankSettingsSchema,
  bblGatewayReady,
  bblWebhookEventSchema,
  bblMismatchMessage,
  maskAccountNumber,
  matchBblTransfer,
  readBankSettings,
  updateBankSettingsInputSchema,
  type BblTransfer,
} from '../src/banking.js';

const transfer = (overrides: Partial<BblTransfer> = {}): BblTransfer => ({
  reference: 'BANK-1234',
  amount: 40_000,
  receivedAt: '2026-10-22T09:00:00.000Z',
  receiverAccount: '1234567890',
  senderName: 'อรุณี ใจดี',
  senderAccount: '0987654321',
  channel: 'mobile',
  ...overrides,
});

const now = new Date('2026-10-22T10:00:00.000Z');
const expected = { accountNumber: '1234567890', reference: 'BANK-1234', amount: 40_000 };

describe('bank settings', () => {
  it('starts without an account and with slip verification on', () => {
    const settings = bankSettingsSchema.parse({});

    expect(settings.provider).toBe('bbl');
    expect(settings.accountNumber).toBeNull();
    expect(settings.autoVerifySlips).toBe(true);
  });

  it('treats an empty account number as not linked', () => {
    expect(readBankSettings({ accountNumber: '  ' }).accountNumber).toBeNull();
  });

  it('rejects an account number that is not ten digits', () => {
    expect(() => bankSettingsSchema.parse({ accountNumber: '12345' })).toThrow();
    expect(bankSettingsSchema.parse({ accountNumber: '1234567890' }).accountNumber).toBe(
      '1234567890',
    );
  });

  it('never lets a settings form write the connection fields', () => {
    const parsed = updateBankSettingsInputSchema.parse({
      accountNumber: '1234567890',
      connectedAt: '2026-10-22T09:00:00.000Z',
    });

    expect(parsed).toEqual({ accountNumber: '1234567890' });
  });

  it('accepts a write-only secret and clears the API key with null', () => {
    const parsed = updateBankSettingsInputSchema.parse({
      clientId: 'client-id',
      clientSecret: 'super-secret',
      apiKey: null,
      baseUrl: 'https://api.bangkokbank.com',
    });

    expect(parsed).toMatchObject({
      clientId: 'client-id',
      clientSecret: 'super-secret',
      apiKey: null,
      baseUrl: 'https://api.bangkokbank.com',
    });
  });

  it('refuses a bank URL that is not https', () => {
    expect(() =>
      updateBankSettingsInputSchema.parse({ baseUrl: 'http://api.bangkokbank.com' }),
    ).toThrow('https');
  });

  it('accepts an empty base URL, which means the bank default', () => {
    expect(updateBankSettingsInputSchema.parse({ baseUrl: '' }).baseUrl).toBe('');
  });

  it('reports credentials as ready only when both halves exist', () => {
    expect(bankCredentialsReady({ clientId: 'id', clientSecret: 'enc:v1:x' })).toBe(true);
    expect(bankCredentialsReady({ clientId: 'id', clientSecret: '' })).toBe(false);
    expect(bankCredentialsReady({ clientId: '', clientSecret: 'enc:v1:x' })).toBe(false);
  });

  it('asks for a callback key before offering the gateway', () => {
    expect(bblGatewayReady({ clientId: 'id', clientSecret: 'enc', webhookSecret: 'enc' })).toBe(
      true,
    );
    expect(bblGatewayReady({ clientId: 'id', clientSecret: 'enc', webhookSecret: '' })).toBe(false);
  });

  it('accepts the callback shape the bank posts', () => {
    const parsed = bblWebhookEventSchema.parse({
      siteId: '00000000-0000-4000-8000-0000000000b1',
      paymentId: 'pay_1',
      status: 'paid',
      amount: 40_000,
    });

    expect(parsed).toMatchObject({ paymentId: 'pay_1', status: 'paid', amount: 40_000 });
  });

  it('rejects a callback with a fractional amount or unknown status', () => {
    expect(() =>
      bblWebhookEventSchema.parse({
        siteId: '00000000-0000-4000-8000-0000000000b1',
        paymentId: 'pay_1',
        status: 'paid',
        amount: 400.5,
      }),
    ).toThrow();
    expect(() =>
      bblWebhookEventSchema.parse({
        siteId: '00000000-0000-4000-8000-0000000000b1',
        paymentId: 'pay_1',
        status: 'refunded',
        amount: 40_000,
      }),
    ).toThrow();
  });

  it('masks the account for display', () => {
    expect(maskAccountNumber('1234567890')).toBe('123xxxx890');
    expect(maskAccountNumber('1234')).toBe('1234');
  });
});

describe('matchBblTransfer', () => {
  it('accepts a recent transfer with the exact amount and reference', () => {
    expect(matchBblTransfer(transfer(), expected, now)).toEqual({ matched: true, reason: null });
  });

  it('compares the last four digits when the statement masks the account', () => {
    expect(matchBblTransfer(transfer({ receiverAccount: 'xxx-x-x6789-0' }), expected, now)).toEqual(
      {
        matched: true,
        reason: null,
      },
    );
  });

  it('rejects money that arrived in another account', () => {
    const result = matchBblTransfer(transfer({ receiverAccount: '9999999999' }), expected, now);

    expect(result).toEqual({ matched: false, reason: 'account' });
    expect(bblMismatchMessage[result.reason ?? 'account']).toContain('บัญชีปลายทาง');
  });

  it('rejects an amount that differs by one satang', () => {
    expect(matchBblTransfer(transfer({ amount: 39_999 }), expected, now)).toEqual({
      matched: false,
      reason: 'amount',
    });
  });

  it('rejects a reference that belongs to another slip', () => {
    expect(matchBblTransfer(transfer({ reference: 'BANK-9999' }), expected, now)).toEqual({
      matched: false,
      reason: 'reference',
    });
  });

  it('ignores spaces and dashes when comparing references', () => {
    expect(matchBblTransfer(transfer({ reference: 'bank 1234' }), expected, now).matched).toBe(
      true,
    );
  });

  it('rejects a transfer older than the verification window', () => {
    expect(
      matchBblTransfer(transfer({ receivedAt: '2026-10-18T09:00:00.000Z' }), expected, now),
    ).toEqual({ matched: false, reason: 'time' });
  });

  it('rejects a transfer stamped in the future', () => {
    expect(
      matchBblTransfer(transfer({ receivedAt: '2026-10-22T12:00:00.000Z' }), expected, now),
    ).toEqual({ matched: false, reason: 'time' });
  });
});

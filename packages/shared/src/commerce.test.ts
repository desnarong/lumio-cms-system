import { describe, expect, it } from 'vitest';
import {
  canRefundOrder,
  refundOrderInputSchema,
  cartTotals,
  commerceSettingsSchema,
  crc16,
  formatBaht,
  isPromptPayId,
  orderNumberFor,
  parseBaht,
  parseCartCookie,
  promptPayPayload,
  promptPayTarget,
  serializeCartCookie,
  shippingFeeFor,
  canTransitionOrder,
  readCommerceSettings,
  createProductInputSchema,
  variantIssue,
  variantLabel,
  variantSignature,
} from '../src/commerce.js';

const settings = commerceSettingsSchema.parse({});

describe('money', () => {
  it('shows satang as grouped baht', () => {
    expect(formatBaht(0)).toBe('0.00');
    expect(formatBaht(5)).toBe('0.05');
    expect(formatBaht(129_000)).toBe('1,290.00');
    expect(formatBaht(1_234_567)).toBe('12,345.67');
  });

  it('parses form input, including separators and the baht sign', () => {
    expect(parseBaht('1,290')).toBe(129_000);
    expect(parseBaht('฿ 99.5')).toBe(9_950);
    expect(parseBaht('12.345')).toBeNull();
    expect(parseBaht('-5')).toBeNull();
    expect(parseBaht('')).toBeNull();
  });
});

describe('cart', () => {
  it('round-trips the cookie and drops malformed entries', () => {
    const id = '3f1a8b0c-1111-4c22-9d33-444455556666';
    const raw = serializeCartCookie([
      { productId: id, quantity: 2 },
      { productId: 'not-a-product', quantity: 3 },
    ]);
    expect(raw).toBe(`${id}:2`);
    expect(parseCartCookie(raw)).toEqual([{ productId: id, quantity: 2 }]);
  });

  it('merges duplicate ids and caps the quantity', () => {
    const id = '3f1a8b0c-1111-4c22-9d33-444455556666';
    expect(parseCartCookie(`${id}:2,${id}:3`)).toEqual([{ productId: id, quantity: 5 }]);
    expect(parseCartCookie(`${id}:500`)).toEqual([{ productId: id, quantity: 99 }]);
    expect(parseCartCookie(null)).toEqual([]);
  });

  it('keeps a variant apart from the same product without one', () => {
    const id = '3f1a8b0c-1111-4c22-9d33-444455556666';
    const variant = '7a3c0d2e-3333-4e44-9f55-666677778888';
    const raw = serializeCartCookie([
      { productId: id, quantity: 1 },
      { productId: id, variantId: variant, quantity: 2 },
    ]);
    expect(raw).toBe(`${id}:1,${id}:${variant}:2`);
    expect(parseCartCookie(raw)).toEqual([
      { productId: id, quantity: 1 },
      { productId: id, variantId: variant, quantity: 2 },
    ]);
  });

  it('adds shipping until the free threshold is reached', () => {
    expect(shippingFeeFor(10_000, settings)).toBe(settings.shippingFee);
    expect(shippingFeeFor(50_000, settings)).toBe(0);
    expect(shippingFeeFor(0, settings)).toBe(0);
    expect(shippingFeeFor(49_999, { ...settings, freeShippingThreshold: null })).toBe(
      settings.shippingFee,
    );
  });

  it('adds a zone fee and weight surcharge', () => {
    const zoned = commerceSettingsSchema.parse({
      shippingFee: 5_000,
      shippingPerKgFee: 2_000,
      shippingZones: [{ label: 'เหนือ', provinces: ['เชียงใหม่'], fee: 8_000 }],
    });
    expect(shippingFeeFor(10_000, zoned, { weightGrams: 2_400, province: 'จ.เชียงใหม่' })).toBe(
      14_000,
    );
    expect(shippingFeeFor(10_000, zoned, { weightGrams: 2_400, province: 'กรุงเทพฯ' })).toBe(
      11_000,
    );
  });

  it('totals lines from server prices', () => {
    expect(cartTotals([{ price: 25_000, quantity: 2 }], settings)).toEqual({
      subtotal: 50_000,
      shippingFee: 0,
      weightGrams: 0,
      total: 50_000,
    });
  });
});

describe('settings', () => {
  it('accepts a phone or a 13-digit id for PromptPay', () => {
    expect(isPromptPayId('0812345678')).toBe(true);
    expect(isPromptPayId('1234567890123')).toBe(true);
    expect(isPromptPayId('081234567')).toBe(false);
    expect(isPromptPayId('12345')).toBe(false);
  });

  it('falls back to defaults instead of failing on old rows', () => {
    const parsed = readCommerceSettings({ shippingFee: 'lots' });
    expect(parsed.shippingFee).toBe(settings.shippingFee);
    expect(parsed.payments.promptpay).toBe(true);
  });

  it('rejects an empty promptPayId in the schema when sent as empty string', () => {
    // The admin sends null to clear it; an empty string is not a valid target.
    const result = commerceSettingsSchema.safeParse({ promptPayId: '123' });
    expect(result.success).toBe(false);
  });
});

describe('promptpay payload', () => {
  it('uses the CCITT-FALSE checksum', () => {
    // Known check value for "123456789" from the CRC-16/CCITT-FALSE spec.
    expect(crc16('123456789')).toBe('29B1');
  });

  it('normalizes a phone number to the 0066 form', () => {
    expect(promptPayTarget('081-234-5678')).toBe('0066812345678');
    expect(promptPayTarget('1234567890123')).toBe('1234567890123');
  });

  it('builds a payload whose trailing CRC matches its own body', () => {
    const payload = promptPayPayload('0812345678', 129_000);
    expect(payload.startsWith('00020101021229')).toBe(true);
    expect(payload).toContain('5303764');
    expect(payload).toContain('54071290.00');
    expect(payload).toContain('5802TH');
    expect(payload.endsWith(crc16(payload.slice(0, -4)))).toBe(true);
  });

  it('refuses a free or targetless payload', () => {
    expect(() => promptPayPayload('0812345678', 0)).toThrow();
    expect(() => promptPayPayload('', 1_000)).toThrow();
  });
});

describe('product variants', () => {
  const options = [
    { name: 'ไซซ์', values: ['S', 'M'] },
    { name: 'สี', values: ['ดำ', 'ขาว'] },
  ];
  const variant = { options: { 'ไซซ์': 'M', 'สี': 'ดำ' }, sku: null, price: null, compareAtPrice: null, stock: 3 };

  it('checks every option is chosen from its own values', () => {
    expect(variantIssue(options, variant)).toBeNull();
    expect(variantIssue(options, { ...variant, options: { 'ไซซ์': 'XL', 'สี': 'ดำ' } })).toContain('XL');
    expect(variantIssue(options, { ...variant, options: { 'ไซซ์': 'M' } })).not.toBeNull();
  });

  it('builds a stable signature and a readable label', () => {
    expect(variantSignature(options, variant)).toBe('ไซซ์=M|สี=ดำ');
    expect(variantLabel(options, variant)).toBe('M · ดำ');
  });

  it('rejects a product whose variants do not match its options', () => {
    const base = {
      title: 'เสื้อยืด',
      slug: 't-shirt',
      description: '',
      price: 29_000,
      compareAtPrice: null,
      images: [],
      stock: null,
      weightGrams: 0,
      category: null,
      status: 'active',
    };
    expect(createProductInputSchema.safeParse({ ...base, options, variants: [variant] }).success).toBe(true);
    expect(createProductInputSchema.safeParse({ ...base, options, variants: [] }).success).toBe(false);
  });
});

describe('orders', () => {
  it('allows only forward status moves', () => {
    expect(canTransitionOrder('pending', 'paid')).toBe(true);
    expect(canTransitionOrder('pending', 'shipped')).toBe(false);
    expect(canTransitionOrder('shipped', 'completed')).toBe(true);
    expect(canTransitionOrder('cancelled', 'paid')).toBe(false);
    expect(canTransitionOrder('completed', 'completed')).toBe(true);
  });

  it('lets money go back only after it arrived', () => {
    expect(canRefundOrder('paid')).toBe(true);
    expect(canRefundOrder('shipped')).toBe(true);
    expect(canRefundOrder('completed')).toBe(true);
    expect(canRefundOrder('pending')).toBe(false);
    expect(canRefundOrder('cancelled')).toBe(false);
    expect(canRefundOrder('refunded')).toBe(false);
  });

  it('treats a refund with no amount as the whole remaining order', () => {
    const parsed = refundOrderInputSchema.parse({});
    expect(parsed.amount).toBeUndefined();
    expect(parsed.restock).toBe(true);
    expect(parsed.reason).toBe('');
  });

  it('refuses a refund of zero baht', () => {
    expect(refundOrderInputSchema.safeParse({ amount: 0 }).success).toBe(false);
  });

  it('formats the order number with the Bangkok-day suffix', () => {
    expect(orderNumberFor(new Date('2026-10-22T03:00:00Z'), 'ab12cd')).toBe('LM-261022-AB12CD');
  });
});

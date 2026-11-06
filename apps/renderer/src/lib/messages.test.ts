import { describe, expect, it } from 'vitest';
import { EN, TH, money, shippingFee, storefrontT, type StorefrontKey } from './messages';

const placeholders = (message: string): string[] =>
  [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

describe('storefront messages', () => {
  const keys = Object.keys(TH) as StorefrontKey[];

  it('has an English message for every Thai key', () => {
    expect(Object.keys(EN).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(EN[key].trim(), key).not.toBe('');
  });

  it('keeps the same placeholders in both languages', () => {
    for (const key of keys) expect(placeholders(EN[key]), key).toEqual(placeholders(TH[key]));
  });

  it('writes no Thai in the English catalogue', () => {
    // \u0E3F (U+0E3F) sits in the Thai block but is the currency sign English uses too.
    for (const key of keys) expect(EN[key], key).not.toMatch(/[\u0E00-\u0E3E\u0E40-\u0E7F]/);
  });

  it('fills placeholders and formats baht per language', () => {
    expect(storefrontT('th')('order.title', { number: 'LM-1' })).toBe('คำสั่งซื้อ LM-1');
    expect(storefrontT('en')('order.title', { number: 'LM-1' })).toBe('Order LM-1');
    expect(money(storefrontT('th'), 120_000)).toBe('1,200.00 บาท');
    expect(money(storefrontT('en'), 120_000)).toBe('฿1,200.00');
    expect(shippingFee(storefrontT('en'), 0)).toBe('Free');
  });

  it('falls back to Thai for an unknown language', () => {
    expect(storefrontT('fr')('common.free')).toBe('ฟรี');
    expect(storefrontT(null)('common.free')).toBe('ฟรี');
  });
});

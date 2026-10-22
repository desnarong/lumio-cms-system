import { describe, expect, it } from 'vitest';
import {
  combinationKey,
  combinationLabel,
  formatOptionsText,
  optionCombinations,
  parseOptionsText,
} from './product-variants.js';

describe('product option text', () => {
  it('parses one option per line and drops malformed lines', () => {
    expect(parseOptionsText('ไซซ์: S, M, L\nสี: ดำ, ขาว\nไม่ถูกต้อง')).toEqual([
      { name: 'ไซซ์', values: ['S', 'M', 'L'] },
      { name: 'สี', values: ['ดำ', 'ขาว'] },
    ]);
    expect(formatOptionsText([{ name: 'ไซซ์', values: ['S', 'M'] }])).toBe('ไซซ์: S, M');
  });

  it('builds every combination in option order', () => {
    const options = [
      { name: 'ไซซ์', values: ['S', 'M'] },
      { name: 'สี', values: ['ดำ', 'ขาว'] },
    ];
    const combinations = optionCombinations(options);

    expect(combinations).toHaveLength(4);
    expect(combinationKey(combinations[0]!)).toBe('ไซซ์=S|สี=ดำ');
    expect(combinationLabel(options, combinations[3]!)).toBe('M · ขาว');
  });
});

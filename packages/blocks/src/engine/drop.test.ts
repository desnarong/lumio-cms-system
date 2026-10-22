import { describe, expect, it } from 'vitest';
import { resolveDropIndex } from './drop.js';

const rects = [
  { top: 0, height: 100 },
  { top: 100, height: 100 },
  { top: 200, height: 100 },
];

describe('resolveDropIndex', () => {
  it('drops before the first block when the pointer is above its middle', () => {
    expect(resolveDropIndex(rects, 10)).toBe(0);
  });

  it('drops after a block once the pointer passes its middle', () => {
    expect(resolveDropIndex(rects, 60)).toBe(1);
  });

  it('drops between the second and third block', () => {
    expect(resolveDropIndex(rects, 200)).toBe(2);
  });

  it('drops at the end when the pointer is below every block', () => {
    expect(resolveDropIndex(rects, 500)).toBe(3);
  });

  it('handles an empty list', () => {
    expect(resolveDropIndex([], 42)).toBe(0);
  });
});

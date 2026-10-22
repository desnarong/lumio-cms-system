import { describe, expect, it } from 'vitest';
import { safeNextPath, withCartItem } from './cart.js';

const A = '3f1a8b0c-1111-4c22-9d33-444455556666';
const B = '7a3c0d2e-3333-4e44-9f55-666677778888';
const V = '9d4e5f60-1111-4a22-8b33-ccccddddeeee';

describe('safeNextPath', () => {
  it('accepts a local path and rejects an off-site redirect', () => {
    expect(safeNextPath('/shop/beans', '/cart')).toBe('/shop/beans');
    expect(safeNextPath('//evil.example', '/cart')).toBe('/cart');
    expect(safeNextPath('https://evil.example', '/cart')).toBe('/cart');
    expect(safeNextPath(null, '/cart')).toBe('/cart');
  });
});

describe('withCartItem', () => {
  it('adds a new line', () => {
    expect(withCartItem([], A, 2)).toEqual([{ productId: A, quantity: 2 }]);
  });

  it('tops up an existing line instead of duplicating it', () => {
    expect(withCartItem([{ productId: A, quantity: 1 }], A, 2)).toEqual([
      { productId: A, quantity: 3 },
    ]);
  });

  it('replaces a quantity when the cart page updates it', () => {
    expect(withCartItem([{ productId: A, quantity: 5 }], A, 2, { replace: true })).toEqual([
      { productId: A, quantity: 2 },
    ]);
  });

  it('removes a line with quantity 0 and ignores a bad id', () => {
    expect(withCartItem([{ productId: A, quantity: 1 }, { productId: B, quantity: 1 }], A, 0)).toEqual([
      { productId: B, quantity: 1 },
    ]);
    expect(withCartItem([{ productId: A, quantity: 1 }], 'not-a-uuid', 1)).toEqual([
      { productId: A, quantity: 1 },
    ]);
  });

  it('keeps variants of the same product as separate lines', () => {
    expect(withCartItem([{ productId: A, quantity: 1 }], A, 1, { variantId: V })).toEqual([
      { productId: A, quantity: 1 },
      { productId: A, variantId: V, quantity: 1 },
    ]);
    expect(withCartItem([{ productId: A, variantId: V, quantity: 1 }], A, 3, { variantId: V })).toEqual([
      { productId: A, variantId: V, quantity: 4 },
    ]);
    expect(
      withCartItem([{ productId: A, variantId: V, quantity: 1 }], A, 0, { variantId: V }),
    ).toEqual([]);
  });

  it('caps a line at the maximum quantity', () => {
    expect(withCartItem([], A, 500)).toEqual([{ productId: A, quantity: 99 }]);
  });
});

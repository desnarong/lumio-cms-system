import { describe, expect, it } from 'vitest';
import { shopCardsFromProducts, shopProductsFor } from './shop.js';

const product = {
  id: 'p1',
  title: 'หลอดไฟ LED',
  slug: 'led-9-5w',
  description: 'แสงนวล ประหยัดไฟ\nบรรทัดที่สองไม่ต้องแสดง',
  price: 26_900,
  compareAtPrice: 45_900,
  currency: 'THB',
  images: ['https://cdn.example.com/led.webp'],
  category: 'โคมไฟ',
};

describe('shopCardsFromProducts', () => {
  it('converts satang to baht and links to the product page', () => {
    const [card] = shopCardsFromProducts([product]);

    expect(card?.price).toBe(269);
    expect(card?.compareAtPrice).toBe(459);
    expect(card?.currency).toBe('฿');
    expect(card?.link).toBe('/shop/led-9-5w');
  });

  it('keeps only the first line of the description', () => {
    const [card] = shopCardsFromProducts([product]);

    expect(card?.description).toBe('แสงนวล ประหยัดไฟ');
  });

  it('leaves a missing compare price and picture empty', () => {
    const [card] = shopCardsFromProducts([
      { ...product, compareAtPrice: null, images: [], soldOut: true },
    ]);

    expect(card?.compareAtPrice).toBeNull();
    expect(card?.image).toBeNull();
    expect(card?.soldOut).toBe(true);
  });
});

describe('shopProductsFor', () => {
  const cards = shopCardsFromProducts([
    product,
    { ...product, id: 'p2', slug: 'mug', category: 'แก้ว' },
    { ...product, id: 'p3', slug: 'lamp-2', category: 'โคมไฟ' },
  ]);

  it('filters by category when one is chosen', () => {
    expect(shopProductsFor({ category: 'โคมไฟ', limit: 12 }, cards).map((card) => card.id)).toEqual([
      'p1',
      'p3',
    ]);
  });

  it('shows every category when the filter is blank', () => {
    expect(shopProductsFor({ category: '  ', limit: 12 }, cards)).toHaveLength(3);
  });

  it('shows only products with an old price on a promotion page', () => {
    const mixed = shopCardsFromProducts([
      product,
      { ...product, id: 'p2', compareAtPrice: null },
      { ...product, id: 'p3', price: 40_000, compareAtPrice: 30_000 },
    ]);

    expect(
      shopProductsFor({ category: '', limit: 12, saleOnly: true }, mixed).map((card) => card.id),
    ).toEqual(['p1']);
  });

  it("stops at the block limit", () => {
    expect(shopProductsFor({ category: '', limit: 2 }, cards)).toHaveLength(2);
  });
});

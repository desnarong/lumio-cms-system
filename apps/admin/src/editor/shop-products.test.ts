import { describe, expect, it } from 'vitest';
import type { ProductSummary } from '@lumio/shared';
import { shopCardsFromSummaries } from './shop-products';

const product = (patch: Partial<ProductSummary> = {}): ProductSummary => ({
  id: 'p1',
  title: 'หลอดไฟ LED',
  slug: 'led-9-5w',
  description: 'แสงนวล',
  tagline: '',
  summary: '',
  rating: null,
  ratingCount: 0,
  price: 26_900,
  compareAtPrice: null,
  currency: 'THB',
  images: ['https://cdn.example.com/led.webp'],
  imageIds: ['m1'],
  specs: [],
  stock: 10,
  weightGrams: 0,
  options: [],
  variants: [],
  category: null,
  status: 'active',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  ...patch,
});

describe('shopCardsFromSummaries', () => {
  it('previews the same card the published page shows', () => {
    const [card] = shopCardsFromSummaries([product()]);

    expect(card).toMatchObject({
      name: 'หลอดไฟ LED',
      price: 269,
      currency: '฿',
      link: '/shop/led-9-5w',
      soldOut: false,
    });
  });

  it('treats a product with no stock left as sold out', () => {
    const [card] = shopCardsFromSummaries([product({ stock: 0 })]);
    expect(card?.soldOut).toBe(true);
  });

  it('treats unlimited stock or one available variant as in stock', () => {
    const [unlimited] = shopCardsFromSummaries([product({ stock: null })]);
    const [withVariant] = shopCardsFromSummaries([
      product({
        stock: 0,
        variants: [
          {
            id: 'v1',
            options: {},
            signature: 'v1',
            label: 'v1',
            sku: null,
            price: null,
            compareAtPrice: null,
            stock: 3,
          },
        ],
      }),
    ]);

    expect(unlimited?.soldOut).toBe(false);
    expect(withVariant?.soldOut).toBe(false);
  });
});

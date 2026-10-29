import { describe, expect, it } from 'vitest';
import { promotionCardViews, type PublicPromotion } from './promotion.js';

const offer = (overrides: Partial<PublicPromotion> = {}): PublicPromotion => ({
  id: 'promo-1',
  title: 'ซื้อ 10 แถม 1',
  description: 'สำหรับหลอด LED',
  kind: 'bundle',
  badge: '',
  imageUrl: null,
  imageAlt: '',
  buyQty: 10,
  getQty: 1,
  startsAt: null,
  endsAt: null,
  ...overrides,
});

describe('promotionCardViews', () => {
  it('carries the chosen picture into the card', () => {
    const [card] = promotionCardViews([
      offer({ imageUrl: 'https://cdn.example.com/promo.jpg', imageAlt: 'หลอด LED ในโปร' }),
    ]);

    expect(card).toMatchObject({
      imageUrl: 'https://cdn.example.com/promo.jpg',
      imageAlt: 'หลอด LED ในโปร',
    });
  });

  it('uses the title as alt text when none was typed', () => {
    const [card] = promotionCardViews([
      offer({ imageUrl: 'https://cdn.example.com/promo.jpg' }),
    ]);

    expect(card?.imageAlt).toBe('ซื้อ 10 แถม 1');
  });

  it('keeps icon-only cards when no picture is set', () => {
    const [card] = promotionCardViews([offer()]);

    expect(card?.imageUrl).toBeNull();
  });
});

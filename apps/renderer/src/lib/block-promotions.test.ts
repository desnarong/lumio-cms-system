import { describe, expect, it, vi } from 'vitest';
import { defaultBlockStyle, type BlockNode, type PublicPage } from '@lumio/shared';
import { demoContents, demoForms, demoGlobalBlocks, demoMenus, demoSite } from './demo';

const { loadPromotionsMock } = vi.hoisted(() => ({ loadPromotionsMock: vi.fn() }));

vi.mock('./content', () => ({ loadPromotions: loadPromotionsMock }));

import { loadPagePromotions, pageReadsPromotions } from './block-promotions';

const block = (type: string, props: Record<string, unknown>): BlockNode => ({
  id: `b_${type}`,
  type,
  version: 1,
  props,
  style: defaultBlockStyle,
  children: [],
});

const pageWith = (blocks: BlockNode[]): PublicPage => {
  const content = demoContents.find((item) => item.slug === 'home');
  if (!content) throw new Error('demo home page is missing');
  return {
    site: demoSite,
    content: { ...content, blocks },
    menus: demoMenus,
    globalBlocks: demoGlobalBlocks,
    forms: demoForms,
    locale: content.locale,
    isFallback: false,
    translations: [],
    redirect: null,
  };
};

describe('pageReadsPromotions', () => {
  it('is true only for a feature grid that follows the promotion list', () => {
    expect(pageReadsPromotions(pageWith([block('features', { source: 'promotions' })]))).toBe(true);
    expect(pageReadsPromotions(pageWith([block('features', { source: 'manual' })]))).toBe(false);
  });
});

describe('loadPagePromotions', () => {
  it('returns nothing for a hand-written feature grid', async () => {
    loadPromotionsMock.mockReset();
    const cards = await loadPagePromotions(
      pageWith([block('features', { source: 'manual' })]),
      'shop.example.com',
    );

    expect(cards).toBeUndefined();
    expect(loadPromotionsMock).not.toHaveBeenCalled();
  });

  it('turns live offers into cards with the deal and end date', async () => {
    loadPromotionsMock.mockReset();
    loadPromotionsMock.mockResolvedValue([
      {
        id: 'promo-1',
        title: 'ซื้อ 10 แถม 1',
        description: 'สำหรับหลอด LED ขั้ว E27',
        kind: 'bundle',
        badge: '',
        imageUrl: 'https://cdn.example.com/promo.jpg',
        imageAlt: 'หลอด LED ในโปร',
        buyQty: 10,
        getQty: 1,
        startsAt: null,
        endsAt: '2026-11-30T23:59:59.000Z',
      },
    ]);

    const cards = await loadPagePromotions(
      pageWith([block('features', { source: 'promotions' })]),
      'shop.example.com',
    );

    expect(cards?.[0]).toMatchObject({
      id: 'promo-1',
      icon: '🎁',
      title: 'ซื้อ 10 แถม 1',
      imageUrl: 'https://cdn.example.com/promo.jpg',
      imageAlt: 'หลอด LED ในโปร',
    });
    expect(cards?.[0]?.description).toContain('ถึง 30/11/2026');
  });
});

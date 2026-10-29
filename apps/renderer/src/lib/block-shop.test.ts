import { describe, expect, it, vi } from 'vitest';
import { defaultBlockStyle, type BlockNode, type PublicPage } from '@lumio/shared';
import { demoContents, demoForms, demoGlobalBlocks, demoMenus, demoSite } from './demo';

const { loadShop } = vi.hoisted(() => ({ loadShop: vi.fn() }));

vi.mock('./shop', () => ({ loadShop }));

import { loadPageShopProducts, pageReadsShopCatalog } from './block-shop';

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

describe('pageReadsShopCatalog', () => {
  it('is true only when a products block reads the catalog', () => {
    expect(pageReadsShopCatalog(pageWith([block('products', { source: 'shop' })]))).toBe(true);
    expect(pageReadsShopCatalog(pageWith([block('products', { source: 'manual' })]))).toBe(false);
    expect(pageReadsShopCatalog(pageWith([block('products', { source: 'sale' })]))).toBe(true);
  });

  it('looks inside nested blocks too', () => {
    const section: BlockNode = {
      ...block('section', {}),
      children: [block('products', { source: 'shop' })],
    };
    expect(pageReadsShopCatalog(pageWith([section]))).toBe(true);
  });
});

describe('loadPageShopProducts', () => {
  it('returns nothing for a page that does not read the catalog', async () => {
    loadShop.mockReset();
    const products = await loadPageShopProducts(
      pageWith([block('products', { source: 'manual' })]),
      'shop.example.com',
    );

    expect(products).toBeUndefined();
    expect(loadShop).not.toHaveBeenCalled();
  });

  it('maps the published products into cards', async () => {
    loadShop.mockReset();
    loadShop.mockResolvedValue({
      products: [
        {
          id: 'p1',
          title: 'หลอดไฟ LED',
          slug: 'led-9-5w',
          description: 'แสงนวล',
          price: 26_900,
          compareAtPrice: null,
          currency: 'THB',
          images: ['https://cdn.example.com/led.webp'],
          stock: 0,
          inStock: false,
          weightGrams: 0,
          options: [],
          variants: [],
          category: null,
          specs: [],
        },
      ],
    });

    const products = await loadPageShopProducts(
      pageWith([block('products', { source: 'shop' })]),
      'shop.example.com',
    );

    expect(products).toHaveLength(1);
    expect(products?.[0]).toMatchObject({
      name: 'หลอดไฟ LED',
      price: 269,
      link: '/shop/led-9-5w',
      soldOut: true,
    });
  });

  it('keeps the saved cards when the shop cannot be read', async () => {
    loadShop.mockReset();
    loadShop.mockRejectedValue(new Error('ร้านค้าปิดอยู่'));

    await expect(
      loadPageShopProducts(pageWith([block('products', { source: 'shop' })]), 'shop.example.com'),
    ).resolves.toBeUndefined();
  });
});

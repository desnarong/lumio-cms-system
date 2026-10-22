import { describe, expect, it, vi } from 'vitest';
import {
  ApiUnavailableError,
  ContentNotFoundError,
  createPublicApi,
  type FetchLike,
  type FetchResponse,
} from './api';

const page = {
  site: {
    id: 's1',
    name: 'กาแฟบ้านดอย',
    subdomain: 'baandoi',
    localeDefault: 'th',
    locales: ['th'],
    themeTokens: {},
    settings: {},
  },
  content: {
    id: 'c1',
    type: 'page',
    title: 'หน้าแรก',
    slug: 'home',
    locale: 'th',
    excerpt: null,
    seo: { noindex: false },
    blocks: [],
    publishedAt: null,
    updatedAt: '2026-10-20T00:00:00.000Z',
    coverImage: null,
  },
  menus: { header: [], footer: [] },
  locale: 'th',
  redirect: null,
};

const respond = (body: unknown, init: { ok?: boolean; status?: number } = {}): FetchResponse => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => body,
});

describe('createPublicApi', () => {
  it('calls the public endpoint with the host and slug, then unwraps data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond({ data: page })) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100/', fetchImpl });

    const result = await api.getPage('baandoi.lumio.app', 'home');

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api:49100/api/v1/public/baandoi.lumio.app/pages/home',
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
    expect(result.content?.title).toBe('หน้าแรก');
  });

  it('encodes the host and slug so a weird host cannot break the path', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond({ data: page })) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    await api.getPost('evil host/x', 'a/b');

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api:49100/api/v1/public/evil%20host%2Fx/posts/a%2Fb',
      expect.anything(),
    );
  });

  it('asks for the requested language', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond({ data: page })) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    await api.getPage('baandoi.lumio.app', 'about', 'en');

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api:49100/api/v1/public/baandoi.lumio.app/pages/about?locale=en',
      expect.anything(),
    );
  });

  it('validates the payload with the shared schema', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respond({ data: { ...page, content: { ...page.content, blocks: 'nope' } } })) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    await expect(api.getPage('baandoi.lumio.app', 'home')).rejects.toThrowError();
  });

  it('maps 404 to ContentNotFoundError', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respond({ error: 'not_found' }, { ok: false, status: 404 })) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    await expect(api.getPage('baandoi.lumio.app', 'nope')).rejects.toBeInstanceOf(
      ContentNotFoundError,
    );
  });

  it('maps a 500 and a network error to ApiUnavailableError', async () => {
    const failing = vi
      .fn()
      .mockResolvedValue(respond({}, { ok: false, status: 500 })) as unknown as FetchLike;
    const down = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as FetchLike;

    await expect(
      createPublicApi({ baseUrl: 'http://api:49100', fetchImpl: failing }).getPage('h', 's'),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
    await expect(
      createPublicApi({ baseUrl: 'http://api:49100', fetchImpl: down }).listPosts('h'),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('reads the sitemap list', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        respond({ data: { site: page.site, urls: [{ path: '/', lastmod: null, type: 'page' }] } }),
      ) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    const sitemap = await api.getSitemap('baandoi.lumio.app');

    expect(sitemap.urls).toHaveLength(1);
  });

  it('posts a page-view beacon to the collect endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond({ data: { success: true } })) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    await api.collectPageview('baandoi.lumio.app', { path: '/services', visitorId: 'v1' });

    const [url, init] = (fetchImpl as unknown as { mock: { calls: [string, { body: string }][] } }).mock
      .calls[0]!;
    expect(url).toBe('http://api:49100/api/v1/public/baandoi.lumio.app/collect');
    expect(JSON.parse(init.body)).toEqual({ path: '/services', visitorId: 'v1' });
  });

  it('never throws when the beacon cannot be sent', async () => {
    const down = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl: down });

    await expect(api.collectPageview('h', { path: '/' })).resolves.toBeUndefined();
  });
});

const shopProduct = {
  id: '3f1a8b0c-1111-4c22-9d33-444455556666',
  title: 'กาแฟคั่วกลาง',
  slug: 'medium-roast',
  description: 'คั่วกลาง',
  price: 35_000,
  compareAtPrice: null,
  currency: 'THB',
  images: [],
  stock: 10,
  inStock: true,
  category: null,
};

const shopChrome = {
  site: { ...page.site, logoUrl: null },
  menus: { header: [], footer: [] },
  globalBlocks: { header: [], footer: [] },
  locale: 'th',
};

const order = {
  number: 'LM-261022-AB12',
  token: 'token-1',
  status: 'pending',
  paymentMethod: 'promptpay',
  customerName: 'อรุณี',
  customerPhone: '08xxxxx567',
  items: [
    {
      productId: shopProduct.id,
      title: shopProduct.title,
      price: 35_000,
      quantity: 1,
      image: null,
      lineTotal: 35_000,
    },
  ],
  subtotal: 35_000,
  shippingFee: 5_000,
  total: 40_000,
  currency: 'THB',
  trackingNumber: null,
  paymentUrl: null,
  createdAt: '2026-10-22T09:00:00.000Z',
  paidAt: null,
};

const settings = {
  promptPayId: '0812345678',
  shippingFee: 5_000,
  freeShippingThreshold: 50_000,
  payments: { promptpay: true, cod: true, card: false },
};

describe('shop endpoints', () => {
  it('loads the catalog and validates it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      respond({
        data: {
          ...shopChrome,
          products: [shopProduct],
          categories: [],
          settings,
        },
      }),
    ) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    const shop = await api.getShop('baandoi.lumio.app');

    expect(shop.products[0]?.slug).toBe('medium-roast');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api:49100/api/v1/public/baandoi.lumio.app/shop',
      expect.anything(),
    );
  });

  it('posts the cart for server-side pricing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      respond({
        data: {
          ...shopChrome,
          cart: {
            items: [{ product: shopProduct, quantity: 2, lineTotal: 70_000 }],
            count: 2,
            subtotal: 70_000,
            shippingFee: 0,
            total: 70_000,
            currency: 'THB',
          },
          settings,
        },
      }),
    ) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    const priced = await api.priceCart('baandoi.lumio.app', [
      { productId: shopProduct.id, quantity: 2 },
    ]);

    expect(priced.cart.total).toBe(70_000);
    const calls = (fetchImpl as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls;
    expect(calls[0]?.[1].body).toContain('"quantity":2');
  });

  it('creates an order and reads it back by token', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        respond({ data: { order, payment: { promptPayPayload: '000201', promptPayId: '0812345678', redirectUrl: null } } }),
      )
      .mockResolvedValueOnce(
        respond({
          data: {
            ...shopChrome,
            order,
            payment: { promptPayPayload: null, promptPayId: null, redirectUrl: null },
            settings,
          },
        }),
      ) as unknown as FetchLike;
    const api = createPublicApi({ baseUrl: 'http://api:49100', fetchImpl });

    const created = await api.createOrder('baandoi.lumio.app', {
      items: [{ productId: shopProduct.id, quantity: 1 }],
      customer: {
        name: 'อรุณี',
        phone: '0891234567',
        email: null,
        address: '128 นิมมาน',
        subdistrict: '',
        district: '',
        province: 'เชียงใหม่',
        postcode: '50200',
      },
      paymentMethod: 'promptpay',
      note: '',
    });
    expect(created.order.number).toBe('LM-261022-AB12');

    const found = await api.getOrder('baandoi.lumio.app', 'token-1');
    expect(found.order.status).toBe('pending');
  });
});

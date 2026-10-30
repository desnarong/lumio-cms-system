import {
  cartInputSchema,
  orderCreatedSchema,
  orderLookupInputSchema,
  pageviewInputSchema,
  publicOrderSchema,
  shopCartResponseSchema,
  shopHomeResponseSchema,
  shopOrderResponseSchema,
  shopProductResponseSchema,
  slipSubmissionSchema,
  publicPageSchema,
  publicPostListSchema,
  publicPromotionListSchema,
  publicSitemapSchema,
  type PageviewInput,
  type PublicPage,
  type PublicOrder,
  type PublicPostList,
  type PublicPromotion,
  type PublicSitemap,
  type CartInput,
  type CreateOrderInput,
  type OrderCreatedResponse,
  type OrderLookupInput,
  type ShopCartResponse,
  type ShopHomeResponse,
  type ShopOrderResponse,
  type ShopProductResponse,
  type PaymentSlipInput,
  type SlipSubmission,
  type SubmitFormInput,
} from '@lumio/shared';

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Next.js ISR hint: how long the fetched payload stays fresh. */
  next?: { revalidate?: number | false };
  /** `no-store` for draft previews, which must never be cached. */
  cache?: 'no-store';
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string, init?: FetchOptions) => Promise<FetchResponse>;

/** The page exists but is not published (or never existed). */
export class ContentNotFoundError extends Error {
  constructor(message = 'ไม่พบหน้านี้') {
    super(message);
    this.name = 'ContentNotFoundError';
  }
}

/** The API could not answer; callers may fall back to demo content in dev. */
export class ApiUnavailableError extends Error {
  constructor(message = 'ต่อ API ไม่ได้') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export interface PublicApi {
  getPage(host: string, slug: string, locale?: string): Promise<PublicPage>;
  getPost(host: string, slug: string, locale?: string): Promise<PublicPage>;
  listPosts(host: string, locale?: string): Promise<PublicPostList>;
  /** Offers the shop is running right now, for the promotion page. */
  listPromotions(host: string): Promise<PublicPromotion[]>;
  getSitemap(host: string): Promise<PublicSitemap>;
  /** Draft preview by signed token; always fetched fresh, never cached (design 10.4). */
  getPreview(token: string): Promise<PublicPage>;
  /**
   * Forwards a contact-form submission to the API. The renderer calls it from a
   * route handler, never from the visitor's browser.
   */
  submitForm(host: string, formId: string, input: SubmitFormInput): Promise<{ ok: boolean }>;
  /**
   * Records one page view (docs/design/05-admin-ia.md "เติบโต › Analytics").
   * Called from a route handler, so the browser never talks to the API directly.
   */
  collectPageview(host: string, input: PageviewInput): Promise<void>;
  /** Storefront catalog, priced cart and checkout (docs/design/03-scope.md 3.3). */
  getShop(host: string, locale?: string): Promise<ShopHomeResponse>;
  getShopProduct(host: string, slug: string, locale?: string): Promise<ShopProductResponse>;
  priceCart(host: string, items: CartInput['items'], locale?: string): Promise<ShopCartResponse>;
  createOrder(host: string, input: CreateOrderInput, locale?: string): Promise<OrderCreatedResponse>;
  getOrder(host: string, token: string, locale?: string): Promise<ShopOrderResponse>;
  /** Reopens an order from its number plus the phone or email used at checkout. */
  lookupOrder(host: string, input: OrderLookupInput): Promise<PublicOrder>;
  /** Uploads a PromptPay slip; an exact amount confirms the order automatically. */
  submitSlip(
    host: string,
    token: string,
    input: PaymentSlipInput,
    locale?: string,
  ): Promise<SlipSubmission>;
}

export interface PublicApiOptions {
  baseUrl: string;
  fetchImpl?: FetchLike;
  /** Seconds a page may be served from cache before Next rebuilds it. */
  revalidate?: number;
}

const unwrap = (body: unknown): unknown =>
  body !== null && typeof body === 'object' && 'data' in body
    ? (body as { data: unknown }).data
    : body;

/** `?locale=...` query for the public delivery routes, empty for the default. */
const localeQuery = (locale?: string): string =>
  locale && locale.length > 0 ? `?locale=${encodeURIComponent(locale)}` : '';

/**
 * Read-only client for `/api/v1/public/:host/...` (docs/design/12-api.md 12.7).
 * Responses are validated with the shared schemas, so a breaking API change
 * fails loudly here instead of rendering a half-empty page.
 */
export const createPublicApi = (options: PublicApiOptions): PublicApi => {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const revalidate = options.revalidate ?? 60;

  const request = async <T>(path: string, parse: (value: unknown) => T): Promise<T> => {
    let response: FetchResponse;
    try {
      response = await fetchImpl(`${baseUrl}/api/v1/public/${path}`, {
        headers: { accept: 'application/json' },
        next: { revalidate },
      });
    } catch (error) {
      throw new ApiUnavailableError(String(error));
    }

    if (response.status === 404) throw new ContentNotFoundError();
    if (!response.ok) throw new ApiUnavailableError(`API responded ${response.status}`);

    const body = await response.json();
    return parse(unwrap(body));
  };

  const postJson = async <T>(path: string, body: unknown, parse: (value: unknown) => T): Promise<T> => {
    let response: FetchResponse;
    try {
      response = await fetchImpl(`${baseUrl}/api/v1/public/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ApiUnavailableError(String(error));
    }
    if (response.status === 404) throw new ContentNotFoundError();
    if (!response.ok) throw new ApiUnavailableError(`API responded ${response.status}`);
    return parse(unwrap(await response.json()));
  };

  return {
    getPage: (host, slug, locale) =>
      request(`${encodeURIComponent(host)}/pages/${encodeURIComponent(slug)}${localeQuery(locale)}`, (value) =>
        publicPageSchema.parse(value),
      ),
    getPost: (host, slug, locale) =>
      request(`${encodeURIComponent(host)}/posts/${encodeURIComponent(slug)}${localeQuery(locale)}`, (value) =>
        publicPageSchema.parse(value),
      ),
    listPosts: (host, locale) =>
      request(`${encodeURIComponent(host)}/posts${localeQuery(locale)}`, (value) =>
        publicPostListSchema.parse(value),
      ),
    listPromotions: (host) =>
      request(`${encodeURIComponent(host)}/promotions`, (value) =>
        publicPromotionListSchema.parse(value),
      ),
    getSitemap: (host) =>
      request(`${encodeURIComponent(host)}/sitemap`, (value) => publicSitemapSchema.parse(value)),
    getPreview: async (token) => {
      let response: FetchResponse;
      try {
        response = await fetchImpl(
          `${baseUrl}/api/v1/preview/${encodeURIComponent(token)}`,
          { headers: { accept: 'application/json' }, cache: 'no-store' },
        );
      } catch (error) {
        throw new ApiUnavailableError(String(error));
      }
      if (response.status === 404) throw new ContentNotFoundError();
      if (!response.ok) throw new ApiUnavailableError(`API responded ${response.status}`);
      return publicPageSchema.parse(unwrap(await response.json()));
    },
    submitForm: async (host, formId, input) => {
      let response: FetchResponse;
      try {
        response = await fetchImpl(
          `${baseUrl}/api/v1/public/${encodeURIComponent(host)}/forms/${encodeURIComponent(
            formId,
          )}/submit`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(input),
          },
        );
      } catch (error) {
        throw new ApiUnavailableError(String(error));
      }

      if (response.status === 404) throw new ContentNotFoundError('ไม่พบฟอร์มนี้');
      if (!response.ok) throw new ApiUnavailableError(`API responded ${response.status}`);

      const data = unwrap(await response.json()) as { ok?: boolean } | null;
      return { ok: data?.ok !== false };
    },
    getShop: (host, locale) =>
      request(`${encodeURIComponent(host)}/shop${localeQuery(locale)}`, (value) =>
        shopHomeResponseSchema.parse(value),
      ),
    getShopProduct: (host, slug, locale) =>
      request(
        `${encodeURIComponent(host)}/shop/products/${encodeURIComponent(slug)}${localeQuery(locale)}`,
        (value) => shopProductResponseSchema.parse(value),
      ),
    priceCart: (host, items, locale) =>
      postJson(
        `${encodeURIComponent(host)}/shop/cart${localeQuery(locale)}`,
        cartInputSchema.parse({ items }),
        (value) => shopCartResponseSchema.parse(value),
      ),
    createOrder: (host, input, locale) =>
      postJson(
        `${encodeURIComponent(host)}/shop/orders${localeQuery(locale)}`,
        input,
        (value) => orderCreatedSchema.parse(value),
      ),
    getOrder: (host, token, locale) =>
      request(
        `${encodeURIComponent(host)}/shop/orders/${encodeURIComponent(token)}${localeQuery(locale)}`,
        (value) => shopOrderResponseSchema.parse(value),
      ),
    lookupOrder: (host, input) =>
      postJson(
        `${encodeURIComponent(host)}/shop/orders/lookup`,
        orderLookupInputSchema.parse(input),
        (value) => publicOrderSchema.parse(value),
      ),
    submitSlip: (host, token, input, locale) =>
      postJson(
        `${encodeURIComponent(host)}/shop/orders/${encodeURIComponent(token)}/slip${localeQuery(locale)}`,
        input,
        (value) => slipSubmissionSchema.parse(value),
      ),
    collectPageview: async (host, input) => {
      const payload = pageviewInputSchema.parse(input);
      try {
        await fetchImpl(
          `${baseUrl}/api/v1/public/${encodeURIComponent(host)}/collect`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(payload),
          },
        );
      } catch (error) {
        // A dropped beacon must never break a page, so it is swallowed here.
        void error;
      }
    },
  };
};

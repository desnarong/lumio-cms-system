import type {
  BankConnection,
  CommerceSettings,
  ConnectLink,
  ConnectStatus,
  CreateProductInput,
  OrderDetail,
  OrderList,
  OrderListQuery,
  OrderWebhookView,
  ProductList,
  ProductListQuery,
  ProductSummary,
  Promotion,
  PromotionInput,
  RefundOrderInput,
  ReviewSlipInput,
  UpdateBankSettingsInput,
  UpdateCommerceSettingsInput,
  UpdateOrderStatusInput,
  UpdateOrderWebhookInput,
  UpdateProductInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Products, orders and payment settings of the shop (docs/design/03-scope.md 3.3). */
export interface CommerceApi {
  getSettings(): Promise<CommerceSettings>;
  updateSettings(input: UpdateCommerceSettingsInput): Promise<CommerceSettings>;
  listProducts(query?: ProductListQuery): Promise<ProductList>;
  createProduct(input: CreateProductInput): Promise<ProductSummary>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductSummary>;
  /** Soft delete: the product leaves the shop but old orders keep their receipt. */
  archiveProduct(productId: string): Promise<void>;
  /** Offer campaigns shown on the promotion page (e.g. "ซื้อ 10 แถม 1"). */
  listPromotions(): Promise<Promotion[]>;
  createPromotion(input: PromotionInput): Promise<Promotion>;
  updatePromotion(promotionId: string, input: Partial<PromotionInput>): Promise<Promotion>;
  removePromotion(promotionId: string): Promise<void>;
  listOrders(query?: OrderListQuery): Promise<OrderList>;
  getOrder(orderId: string): Promise<OrderDetail>;
  updateOrderStatus(orderId: string, input: UpdateOrderStatusInput): Promise<OrderDetail>;
  /** Sends the money back and closes the order as refunded. */
  refundOrder(orderId: string, input: RefundOrderInput): Promise<OrderDetail>;
  /** Stripe Connect onboarding for the seller's payouts account. */
  getConnectStatus(): Promise<ConnectStatus>;
  startConnectOnboarding(): Promise<ConnectLink>;
  refreshConnect(): Promise<ConnectStatus>;
  /** Owner approves or rejects the slip attached to an order. */
  reviewSlip(orderId: string, input: ReviewSlipInput): Promise<OrderDetail>;
  /** Bangkok Bank: the owner enters their own credentials, secret never returned. */
  getBankConnection(): Promise<BankConnection>;
  updateBankSettings(input: UpdateBankSettingsInput): Promise<BankConnection>;
  testBankConnection(): Promise<BankConnection>;
  /** Outbound webhook for orders/payments; the signing secret is write-only. */
  getWebhook(): Promise<OrderWebhookView>;
  updateWebhook(input: UpdateOrderWebhookInput): Promise<OrderWebhookView>;
  testWebhook(): Promise<WebhookTestResult>;
}

export interface WebhookTestResult {
  delivered: boolean;
  status: number | null;
  error: string | null;
}

interface Envelope<T> {
  data: T;
  meta?: { cursor?: string | null; total?: number };
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpCommerceApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

const queryString = (query: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text.length > 0 ? `?${text}` : '';
};

/** Talks to `/api/v1/products`, `/orders` and `/commerce/settings`. */
export const createHttpCommerceApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpCommerceApiConfig): CommerceApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const send = async (path: string, init: RequestInit = {}): Promise<Envelope<unknown>> => {
    const token = getAccessToken?.() ?? null;
    const siteId = getSiteId?.() ?? null;

    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(siteId ? { 'x-site-id': siteId } : {}),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      Envelope<unknown> | ErrorEnvelope | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return payload as Envelope<unknown>;
  };

  const request = async <T>(path: string, init?: RequestInit): Promise<T> =>
    (await send(path, init)).data as T;

  return {
    getSettings: async () => request<CommerceSettings>('/commerce/settings'),
    updateSettings: async (input) =>
      request<CommerceSettings>('/commerce/settings', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),

    listProducts: async (query: ProductListQuery = { limit: 100 }) => {
      const payload = await send(`/products${queryString(query as Record<string, unknown>)}`);
      return {
        items: (payload.data ?? []) as ProductSummary[],
        cursor: payload.meta?.cursor ?? null,
        total: payload.meta?.total ?? 0,
      };
    },
    createProduct: async (input) =>
      request<ProductSummary>('/products', { method: 'POST', body: JSON.stringify(input) }),
    updateProduct: async (productId, input) =>
      request<ProductSummary>(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    archiveProduct: async (productId) => {
      await request<{ success: boolean }>(`/products/${productId}`, { method: 'DELETE' });
    },

    listPromotions: () => request<Promotion[]>('/promotions'),
    createPromotion: (input) =>
      request<Promotion>('/promotions', { method: 'POST', body: JSON.stringify(input) }),
    updatePromotion: (promotionId, input) =>
      request<Promotion>(`/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    removePromotion: async (promotionId) => {
      await request<{ success: boolean }>(`/promotions/${promotionId}`, { method: 'DELETE' });
    },

    listOrders: async (query: OrderListQuery = { limit: 100 }) => {
      const payload = await send(`/orders${queryString(query as Record<string, unknown>)}`);
      return {
        items: (payload.data ?? []) as OrderList['items'],
        cursor: payload.meta?.cursor ?? null,
        total: payload.meta?.total ?? 0,
      };
    },
    getOrder: async (orderId) => request<OrderDetail>(`/orders/${orderId}`),
    updateOrderStatus: async (orderId, input) =>
      request<OrderDetail>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    refundOrder: async (orderId, input) =>
      request<OrderDetail>(`/orders/${orderId}/refund`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getConnectStatus: async () => request<ConnectStatus>('/commerce/connect'),
    startConnectOnboarding: async () =>
      request<ConnectLink>('/commerce/connect/link', { method: 'POST' }),
    refreshConnect: async () =>
      request<ConnectStatus>('/commerce/connect/refresh', { method: 'POST' }),
    reviewSlip: async (orderId, input) =>
      request<OrderDetail>(`/orders/${orderId}/slip/review`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getBankConnection: async () => request<BankConnection>('/banking/bbl'),
    updateBankSettings: async (input) =>
      request<BankConnection>('/banking/bbl', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    testBankConnection: async () =>
      request<BankConnection>('/banking/bbl/test', { method: 'POST' }),
    getWebhook: async () => request<OrderWebhookView>('/commerce/webhook'),
    updateWebhook: async (input) =>
      request<OrderWebhookView>('/commerce/webhook', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    testWebhook: async () =>
      request<WebhookTestResult>('/commerce/webhook/test', { method: 'POST' }),
  };
};

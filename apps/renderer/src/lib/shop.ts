import { cookies } from 'next/headers';
import {
  CART_COOKIE,
  CART_COOKIE_MAX_AGE,
  parseCartCookie,
  serializeCartCookie,
  type CartInput,
  type CartItemInput,
  type CreateOrderInput,
  type OrderCreatedResponse,
  type PaymentSlipInput,
  type SlipSubmission,
  type ShopCartResponse,
  type ShopHomeResponse,
  type ShopOrderResponse,
  type ShopProductResponse,
} from '@lumio/shared';
import {
  ApiUnavailableError,
  ContentNotFoundError,
  createPublicApi,
  type PublicApi,
} from './api';
import { createDemoPublicApi } from './demo';

const api = (): PublicApi => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  return baseUrl && baseUrl.length > 0 ? createPublicApi({ baseUrl }) : createDemoPublicApi();
};

const fallbackAllowed = (): boolean => process.env.NODE_ENV !== 'production';

const withFallback = async <T>(load: (client: PublicApi) => Promise<T>): Promise<T> => {
  try {
    return await load(api());
  } catch (error) {
    if (error instanceof ApiUnavailableError && fallbackAllowed()) {
      return load(createDemoPublicApi());
    }
    throw error;
  }
};

export const loadShop = (host: string, locale?: string): Promise<ShopHomeResponse> =>
  withFallback((client) => client.getShop(host, locale));

export const loadShopProduct = (
  host: string,
  slug: string,
  locale?: string,
): Promise<ShopProductResponse> =>
  withFallback((client) => client.getShopProduct(host, slug, locale));

export const priceCart = (
  host: string,
  items: CartInput['items'],
  locale?: string,
): Promise<ShopCartResponse> => withFallback((client) => client.priceCart(host, items, locale));

export const submitSlip = (
  host: string,
  token: string,
  input: PaymentSlipInput,
  locale?: string,
): Promise<SlipSubmission> => withFallback((client) => client.submitSlip(host, token, input, locale));

export const loadOrder = (
  host: string,
  token: string,
  locale?: string,
): Promise<ShopOrderResponse> => withFallback((client) => client.getOrder(host, token, locale));

/** Checkout never falls back to demo data: an unpaid demo order would mislead. */
export const createOrder = (
  host: string,
  input: CreateOrderInput,
  locale?: string,
): Promise<OrderCreatedResponse> => api().createOrder(host, input, locale);

export const loadShopProductOrNull = async (
  host: string,
  slug: string,
  locale?: string,
): Promise<ShopProductResponse | null> => {
  try {
    return await loadShopProduct(host, slug, locale);
  } catch (error) {
    if (error instanceof ContentNotFoundError) return null;
    throw error;
  }
};

export const loadOrderOrNull = async (
  host: string,
  token: string,
  locale?: string,
): Promise<ShopOrderResponse | null> => {
  try {
    return await loadOrder(host, token, locale);
  } catch (error) {
    if (error instanceof ContentNotFoundError) return null;
    throw error;
  }
};

export const readCart = async (): Promise<CartItemInput[]> => {
  const store = await cookies();
  return parseCartCookie(store.get(CART_COOKIE)?.value);
};

export interface CartCookie {
  name: string;
  value: string;
  maxAge: number;
  path: string;
  httpOnly: boolean;
  sameSite: 'lax';
}

export const cartCookie = (items: readonly CartItemInput[]): CartCookie => ({
  name: CART_COOKIE,
  value: serializeCartCookie(items),
  maxAge: CART_COOKIE_MAX_AGE,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
});

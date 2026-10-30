/**
 * What the storefront remembers on one device after a buyer opens an order.
 *
 * Customer passwords are not part of Lumio yet (that is the licensed
 * membership feature), so "signing in" on the public site means proving that
 * you own an order with its number plus the phone or email used at checkout.
 * The cookie keeps only links the buyer has already been given, never anything
 * the API would not hand to the owner of those links.
 */

export const SAVED_ORDERS_COOKIE = 'lumio_orders';
export const SAVED_ORDERS_MAX_AGE = 60 * 60 * 24 * 30;
export const SAVED_ORDERS_MAX = 8;

export interface SavedOrder {
  number: string;
  token: string;
  createdAt: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const isSavedOrder = (value: unknown): value is SavedOrder => {
  const record = asRecord(value);
  return (
    typeof record.number === 'string' &&
    record.number.length > 0 &&
    typeof record.token === 'string' &&
    record.token.length > 0 &&
    typeof record.createdAt === 'string' &&
    record.createdAt.length > 0
  );
};

/** Orders a tampered or older cookie cannot break: bad entries are dropped. */
export const parseSavedOrders = (value: string | undefined | null): SavedOrder[] => {
  if (!value || value.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedOrder).slice(0, SAVED_ORDERS_MAX);
  } catch {
    return [];
  }
};

/** Newest first, one entry per order, so a repeated sign-in never duplicates. */
export const rememberOrder = (
  orders: readonly SavedOrder[],
  order: SavedOrder,
): SavedOrder[] =>
  [
    { number: order.number, token: order.token, createdAt: order.createdAt },
    ...orders.filter((entry) => entry.token !== order.token),
  ].slice(0, SAVED_ORDERS_MAX);

export const serializeSavedOrders = (orders: readonly SavedOrder[]): string =>
  JSON.stringify(orders.slice(0, SAVED_ORDERS_MAX));

export interface SavedOrdersCookie {
  name: string;
  value: string;
  maxAge: number;
  path: string;
  httpOnly: boolean;
  sameSite: 'lax';
}

export const savedOrdersCookie = (orders: readonly SavedOrder[]): SavedOrdersCookie => ({
  name: SAVED_ORDERS_COOKIE,
  value: serializeSavedOrders(orders),
  maxAge: SAVED_ORDERS_MAX_AGE,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
});

/** Date shown beside a saved order, e.g. "22/10/2026". */
export const savedOrderDate = (iso: string): string => {
  const [date] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

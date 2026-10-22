import { MAX_CART_ITEMS, MAX_CART_QUANTITY, type CartItemInput } from '@lumio/shared';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only same-site paths, so a crafted form cannot bounce a buyer off the shop. */
export const safeNextPath = (value: string | null, fallback: string): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
};

export const isProductId = (value: string): boolean => UUID_PATTERN.test(value);

/**
 * Adds (or replaces) one line. Re-adding the same product tops up its quantity
 * instead of creating duplicates, which keeps the cookie and the server cart in
 * a single canonical shape.
 */
export const withCartItem = (
  items: readonly CartItemInput[],
  productId: string,
  quantity: number,
  options: { replace?: boolean; variantId?: string | null } = {},
): CartItemInput[] => {
  if (!isProductId(productId)) return [...items];
  const variantId =
    options.variantId && isProductId(options.variantId) ? options.variantId : undefined;
  const sameLine = (item: CartItemInput): boolean =>
    item.productId === productId && (item.variantId ?? undefined) === variantId;

  const next = quantity < 1 ? 0 : Math.min(quantity, MAX_CART_QUANTITY);
  const existing = items.find(sameLine);

  if (!existing) {
    if (next === 0) return [...items];
    return [...items, { productId, ...(variantId ? { variantId } : {}), quantity: next }].slice(
      0,
      MAX_CART_ITEMS,
    );
  }

  if (next === 0) return items.filter((item) => !sameLine(item));
  return items.map((item) =>
    sameLine(item)
      ? {
          productId,
          ...(variantId ? { variantId } : {}),
          quantity: options.replace ? next : Math.min(item.quantity + next, MAX_CART_QUANTITY),
        }
      : item,
  );
};

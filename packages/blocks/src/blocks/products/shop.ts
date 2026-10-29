import type { ShopProductCard } from '../../types.js';

/**
 * What the admin and the renderer know about one shop product before it becomes
 * a card. Prices are in satang, exactly as the API returns them, so both callers
 * convert the same way and the grid never shows 269 instead of 269.00.
 */
export interface ShopProductLike {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  /** ISO currency of the shop, e.g. "THB". */
  currency?: string;
  images?: readonly string[];
  category?: string | null;
  soldOut?: boolean;
}

const MAX_DESCRIPTION = 140;

/** Keeps a card short: one line, no markup, ends with an ellipsis when cut. */
const shortDescription = (value: string | null | undefined): string => {
  const firstLine =
    (value ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? '';
  return firstLine.length > MAX_DESCRIPTION
    ? `${firstLine.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`
    : firstLine;
};

const baht = (satang: number): number => Math.round(satang) / 100;

const currencyLabel = (currency: string | undefined): string =>
  currency === undefined || currency === 'THB' ? '฿' : currency;

/** Turns shop products into the cards the block renders. */
export const shopCardsFromProducts = (
  products: readonly ShopProductLike[],
): ShopProductCard[] =>
  products.map((product) => ({
    id: product.id,
    name: product.title,
    description: shortDescription(product.description),
    price: baht(product.price),
    compareAtPrice:
      product.compareAtPrice === null || product.compareAtPrice === undefined
        ? null
        : baht(product.compareAtPrice),
    currency: currencyLabel(product.currency),
    image: product.images?.[0] ?? null,
    category: product.category ?? null,
    link: `/shop/${product.slug}`,
    soldOut: product.soldOut ?? false,
  }));

/** Applies the block's category, promotion and limit filters to the live catalog. */
export const shopProductsFor = (
  filters: { category: string; limit: number; saleOnly?: boolean },
  products: readonly ShopProductCard[],
): ShopProductCard[] => {
  const category = filters.category.trim();
  const matching =
    category.length > 0 ? products.filter((product) => product.category === category) : products;
  const onSale = filters.saleOnly
    ? matching.filter(
        (product) => product.compareAtPrice !== null && product.compareAtPrice > product.price,
      )
    : matching;
  return onSale.slice(0, filters.limit);
};

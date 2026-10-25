import type { ProductSummary } from '@lumio/shared';
import { shopCardsFromProducts, type ShopProductCard } from '@lumio/blocks';

/** A product is sold out when every variant (or the product itself) has no stock left. */
const soldOut = (product: ProductSummary): boolean =>
  product.variants.length > 0
    ? product.variants.every((variant) => variant.stock !== null && variant.stock <= 0)
    : product.stock !== null && product.stock <= 0;

/**
 * Turns the admin's product list into the cards a products block previews, so
 * the editor and the published page show the same pictures and prices
 * (docs/design/07-blocks.md 7.8).
 */
export const shopCardsFromSummaries = (
  products: readonly ProductSummary[],
): ShopProductCard[] =>
  shopCardsFromProducts(
    products.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      currency: product.currency,
      images: product.images,
      category: product.category,
      soldOut: soldOut(product),
    })),
  );

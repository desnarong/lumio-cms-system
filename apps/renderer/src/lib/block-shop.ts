import type { BlockNode, PublicPage } from '@lumio/shared';
import { shopCardsFromProducts, type ShopProductCard } from '@lumio/blocks/render';
import { loadShop } from './shop';

/** True when this block grid reads the catalog instead of the saved cards. */
const readsCatalog = (props: Record<string, unknown>): boolean => props.source === 'shop';

const treeReadsCatalog = (blocks: readonly BlockNode[]): boolean =>
  blocks.some(
    (block) =>
      (block.type === 'products' && readsCatalog(block.props)) ||
      treeReadsCatalog(block.children ?? []),
  );

/** Does any part of this page show live shop products? */
export const pageReadsShopCatalog = (page: PublicPage): boolean => {
  if (page.content && treeReadsCatalog(page.content.blocks)) return true;
  return (
    treeReadsCatalog(page.globalBlocks.header) || treeReadsCatalog(page.globalBlocks.footer)
  );
};

/**
 * Products for the page's live product grids, mapped to card data
 * (docs/design/07-blocks.md 7.8). `undefined` means the page has no live grid or
 * the shop could not be read, so the block keeps its saved cards instead of
 * rendering an unexpected empty section.
 */
export const loadPageShopProducts = async (
  page: PublicPage,
  host: string,
  locale?: string,
): Promise<ShopProductCard[] | undefined> => {
  if (!pageReadsShopCatalog(page)) return undefined;
  try {
    const shop = await loadShop(host, locale);
    return shopCardsFromProducts(
      shop.products.map((product) => ({ ...product, soldOut: !product.inStock })),
    );
  } catch {
    return undefined;
  }
};

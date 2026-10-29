import { promotionCardViews, type BlockNode, type PublicPage } from '@lumio/shared';
import type { PromotionCard } from '@lumio/blocks';
import { loadPromotions } from './content';

const blockReadsPromotions = (block: BlockNode): boolean =>
  (block.type === 'features' &&
    (block.props as { source?: unknown }).source === 'promotions') ||
  block.children.some(blockReadsPromotions);

/** True when this page shows the live promotion list. */
export const pageReadsPromotions = (page: PublicPage): boolean =>
  (page.content?.blocks ?? []).some(blockReadsPromotions);

/**
 * Offers the shop is running now, as cards for the feature grid. A page with no
 * live grid gets `undefined`, so the block keeps its saved cards.
 */
export const loadPagePromotions = async (
  page: PublicPage,
  host: string,
): Promise<PromotionCard[] | undefined> => {
  if (!pageReadsPromotions(page)) return undefined;
  try {
    return promotionCardViews(await loadPromotions(host));
  } catch {
    return undefined;
  }
};

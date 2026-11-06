import type { StorefrontT } from './messages';

export type StarFill = 'full' | 'half' | 'empty';

/** Five star fills for a review score, rounding to the nearest half star. */
export const starFills = (rating: number | null): StarFill[] => {
  if (rating === null || !Number.isFinite(rating)) return Array<StarFill>(5).fill('empty');
  const clamped = Math.max(0, Math.min(5, rating));
  return Array.from({ length: 5 }, (_, index) => {
    const remaining = clamped - index;
    if (remaining >= 0.75) return 'full';
    if (remaining >= 0.25) return 'half';
    return 'empty';
  });
};

/** Text a screen reader announces for the star row. */
export const ratingLabel = (
  t: StorefrontT,
  rating: number,
  count: number,
  intl = 'th-TH',
): string =>
  count > 0
    ? t('product.ratingCount', { rating: rating.toFixed(1), count: count.toLocaleString(intl) })
    : t('product.rating', { rating: rating.toFixed(1) });

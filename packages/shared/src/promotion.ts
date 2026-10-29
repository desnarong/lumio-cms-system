import { z } from 'zod';

/**
 * Kinds of offer a shop can run. The kind only decides the icon and the words on
 * the promotion page; money is never calculated from it yet.
 */
export const PROMOTION_KINDS = [
  'bundle',
  'discount',
  'shipping',
  'gift',
  'install',
  'other',
] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];

/** Icon shown on a promotion card, one per kind. */
export const PROMOTION_ICONS: Record<PromotionKind, string> = {
  bundle: '🎁',
  discount: '🏷️',
  shipping: '🚚',
  gift: '🎉',
  install: '🛠️',
  other: '✨',
};

export const isPromotionKind = (value: unknown): value is PromotionKind =>
  typeof value === 'string' && (PROMOTION_KINDS as readonly string[]).includes(value);

export const promotionInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).default(''),
  kind: z.enum(PROMOTION_KINDS).default('other'),
  /** Small ribbon such as "เฉพาะเดือนนี้"; empty hides it. */
  badge: z.string().trim().max(40).default(''),
  /** Picture shown on the promotion card; null keeps the icon only. */
  imageUrl: z.string().trim().url().max(2000).nullable().optional(),
  /** Alt text for the picture; empty falls back to the title. */
  imageAlt: z.string().trim().max(160).default(''),
  /** "buy 10 get 1": units the customer buys … */
  buyQty: z.number().int().min(2).max(1000).nullable().optional(),
  /** … and how many they get free. */
  getQty: z.number().int().min(1).max(1000).nullable().optional(),
  /** ISO timestamps; null means "always". */
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(999).default(0),
});
export type PromotionInput = z.infer<typeof promotionInputSchema>;

export interface Promotion {
  id: string;
  title: string;
  description: string;
  kind: PromotionKind;
  badge: string;
  imageUrl: string | null;
  imageAlt: string;
  buyQty: number | null;
  getQty: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** What the public promotion page needs; no dates the visitor cannot use. */
export const publicPromotionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  kind: z.enum(PROMOTION_KINDS),
  badge: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string(),
  buyQty: z.number().int().nullable(),
  getQty: z.number().int().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});
export type PublicPromotion = z.infer<typeof publicPromotionSchema>;

export const publicPromotionListSchema = z.array(publicPromotionSchema);
export type PublicPromotionList = z.infer<typeof publicPromotionListSchema>;

/** True while the offer is switched on and today falls inside its window. */
export const isPromotionLive = (
  promotion: Pick<Promotion | PublicPromotion, 'startsAt' | 'endsAt'> &
    Partial<Pick<Promotion, 'active'>>,
  now: Date = new Date(),
): boolean => {
  if (promotion.active === false) return false;
  if (promotion.startsAt && new Date(promotion.startsAt).getTime() > now.getTime()) return false;
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() < now.getTime()) return false;
  return true;
};

/** Turns "buy 10 get 1" into the line the promotion page shows under the title. */
export const promotionDealText = (
  promotion: Pick<PublicPromotion, 'kind' | 'buyQty' | 'getQty'>,
): string => {
  if (promotion.kind === 'bundle' && promotion.buyQty && promotion.getQty) {
    return `ซื้อ ${promotion.buyQty} แถม ${promotion.getQty}`;
  }
  if (promotion.kind === 'shipping') return 'ส่งฟรี';
  if (promotion.kind === 'install') return 'ติดตั้งฟรี';
  return '';
};

/** `2026-10-28T04:00:00.000Z` → `28/10/2026` (stable across ICU builds). */
export const promotionDay = (iso: string | null): string => {
  if (!iso) return '';
  const [date] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

/** One offer as a card: title, icon and the line that explains the deal. */
export interface PromotionCardView {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Picture chosen in the admin; null keeps the icon-only card. */
  imageUrl: string | null;
  imageAlt: string;
}

/**
 * Turns live offers into the cards a feature grid renders. The deal text is
 * only added when the title does not already say it, and an end date is shown
 * so a visitor knows how long the offer runs.
 */
export const promotionCardViews = (
  promotions: readonly PublicPromotion[],
): PromotionCardView[] =>
  promotions.map((promotion) => {
    const deal = promotionDealText(promotion);
    const parts = [
      deal.length > 0 && !promotion.title.includes(deal) ? deal : '',
      promotion.description,
      promotion.endsAt ? `ถึง ${promotionDay(promotion.endsAt)}` : '',
    ].filter((part) => part.length > 0);
    return {
      id: promotion.id,
      icon: PROMOTION_ICONS[promotion.kind],
      title: promotion.title,
      description: parts.join(' · '),
      imageUrl: promotion.imageUrl,
      imageAlt: promotion.imageAlt || promotion.title,
    };
  });

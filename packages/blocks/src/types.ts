import type { ComponentType } from 'react';
import type { BlockData, BlockEditorMode, BlockNode, BlockStyle, PublicForm } from '@lumio/shared';
import type { z } from 'zod';

export const BLOCK_CATEGORIES = [
  'structure',
  'text',
  'media',
  'landing',
  'interactive',
  'dynamic',
  'advanced',
] as const;

export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

/** One language a page can be read in, as the language-switcher block renders it. */
export interface LanguageLink {
  locale: string;
  /** Label shown to visitors, e.g. "ไทย" or "English". */
  label: string;
  /** Path of this page in that language. */
  href: string;
  /** True for the language the page is currently shown in. */
  active: boolean;
  /** False when the site offers the language but this page has no version yet. */
  available: boolean;
}

/**
 * One product the shop publishes right now, prepared for a product card.
 * Prices are in baht and picture URLs are already absolute, so the same markup
 * works in SSR, ISR and the editor preview (docs/design/07-blocks.md 7.8).
 */
export interface ShopProductCard {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  image: string | null;
  category: string | null;
  link: string;
  soldOut: boolean;
}

/** One live offer, prepared for a promotion card. */
export interface PromotionCard {
  id: string;
  /** Emoji shown in the icon circle. */
  icon: string;
  title: string;
  description: string;
  /** Picture chosen in the admin; null keeps the icon-only card. */
  imageUrl: string | null;
  imageAlt: string;
}

/**
 * One published post prepared for a post card. Text and date come from the post
 * itself, so a "latest posts" block never shows a card for deleted content.
 */
export interface LatestPostCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Display date already formatted for the page language; empty when unknown. */
  date: string;
  image: string | null;
  link: string;
}

/** Props handed to a block renderer. `style` is already parsed by the shared schema. */
export interface BlockRenderProps<P> {
  props: P;
  style: BlockStyle;
  block: BlockNode;
  /**
   * Definitions of the contact forms the page renders, threaded down from the
   * page payload (docs/design/12-api.md 12.7). Only the form block reads it.
   */
  forms?: readonly PublicForm[];
  /**
   * Languages this page can be read in, threaded down from the page payload
   * (docs/design/17-i18n.md 17.3). Only the language-switcher block reads it.
   */
  languages?: readonly LanguageLink[];
  /**
   * Products the shop publishes right now, so a products block follows the
   * catalog instead of hand-typed cards. `undefined` means "not loaded", which
   * lets an offline preview fall back to the saved items.
   */
  shopProducts?: readonly ShopProductCard[];
  /**
   * Published posts for a posts block that follows the blog instead of hand-typed
   * cards. `undefined` means "not loaded", which lets the editor preview fall
   * back to the saved items.
   */
  latestPosts?: readonly LatestPostCard[];
  /** Offers a feature grid may show instead of hand-typed cards. */
  promotions?: readonly PromotionCard[];
}

/**
 * A dot path into a block node, e.g. `props.heading` or `props.buttons.0.label`.
 * Panels only ever emit paths, so the editor stays agnostic of each block's shape.
 */
export type BlockPath = string;

export interface BlockPanelProps<P> {
  props: P;
  style: BlockStyle;
  /** `simple` hides advanced options; `pro` shows everything. */
  mode: BlockEditorMode;
  onChange: (path: BlockPath, value: unknown) => void;
}

/** Upgrades props from version `N` to `N + 1`. */
export type BlockMigration = (props: Record<string, unknown>) => Record<string, unknown>;

export interface BlockDefinition<P> {
  type: string;
  /** Name in Thai, the source language. */
  label: string;
  /** Name in English for a screen whose language is English. */
  labelEn?: string;
  category: BlockCategory;
  version: number;
  icon?: string;
  /** Validates `{ version, props, style }` and applies every default. */
  schema: z.ZodType<BlockData<P>, z.ZodTypeDef, unknown>;
  defaults: BlockData<P>;
  Block: ComponentType<BlockRenderProps<P>>;
  /**
   * Editor-only controls. It stays optional so a server-render entry can ship
   * blocks without pulling the UI kit and the panels into the public bundle
   * (see `@lumio/blocks/render`).
   */
  Panel?: ComponentType<BlockPanelProps<P>>;
  migrations?: Record<number, BlockMigration>;
}

/** A block a public page can render: everything except the editor panel. */
export type RenderBlockDefinition<P = Record<string, unknown>> = Omit<BlockDefinition<P>, 'Panel'>;

export type AnyBlockDefinition = BlockDefinition<Record<string, unknown>>;

/** Data sources a dynamic block may read from. Server-side only, always site scoped. */
export interface BlockDataSource {
  posts: {
    latest: (input: { siteId: string; limit: number }) => Promise<unknown[]>;
  };
}

export interface BlockLoaderContext {
  siteId: string;
  locale: string;
  db: BlockDataSource;
}

export type BlockLoader<P = Record<string, unknown>, R = unknown> = (
  ctx: BlockLoaderContext,
  params: P,
) => Promise<R>;

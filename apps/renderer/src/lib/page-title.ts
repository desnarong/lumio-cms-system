import { blocksHaveHeadingOne, type BlockNode } from '@lumio/shared';

/** Blocks that always render an `<h1>` of their own. */
export const hasHeadingOne = (blocks: BlockNode[]): boolean => blocksHaveHeadingOne(blocks);

/**
 * SEO score requires exactly one H1 (docs/design/14-seo-performance.md 14.1).
 * Blocks usually provide it; when they do not, the page title fills in.
 */
export const fallbackTitle = (blocks: BlockNode[], title: string): string | null =>
  hasHeadingOne(blocks) ? null : title;

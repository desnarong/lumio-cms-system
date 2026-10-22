import { z } from 'zod';
import { blockTreeSchema } from './blocks.js';

/**
 * Header and footer are global blocks: one edit updates every page
 * (docs/design/08-theme-design-panel.md 8.3). They live in the `global_blocks`
 * table, keyed by `kind`.
 */

export const GLOBAL_BLOCK_KINDS = ['header', 'footer'] as const;
export type GlobalBlockKind = (typeof GLOBAL_BLOCK_KINDS)[number];

export const globalBlockKindSchema = z.enum(GLOBAL_BLOCK_KINDS);

export const GLOBAL_BLOCK_LABELS: Record<GlobalBlockKind, string> = {
  header: 'ส่วนหัวเว็บ (Header)',
  footer: 'ส่วนท้ายเว็บ (Footer)',
};

/** `GET /v1/global-blocks` answers both kinds at once. */
export const globalBlocksSchema = z.object({
  header: blockTreeSchema,
  footer: blockTreeSchema,
});
export type GlobalBlocks = z.infer<typeof globalBlocksSchema>;

export const updateGlobalBlockInputSchema = z.object({
  blocks: blockTreeSchema,
});
export type UpdateGlobalBlockInput = z.infer<typeof updateGlobalBlockInputSchema>;

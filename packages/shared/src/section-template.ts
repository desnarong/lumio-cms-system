import { z } from 'zod';
import { blockTreeSchema, type BlockTree } from './blocks.js';

/**
 * A section the user saved from the editor ("บันทึกเป็นเทมเพลต" in the block
 * menu, docs/design/07-blocks.md 7.2). It lives on the site, not in a pack, and
 * is re-inserted as a block tree the user can edit like any other section.
 */

export const createSectionTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  blocks: blockTreeSchema.refine((blocks) => blocks.length > 0, 'ต้องมีอย่างน้อยหนึ่งส่วน'),
});
export type CreateSectionTemplateInput = z.infer<typeof createSectionTemplateInputSchema>;

/** Renaming a saved section from the Design screen. */
export const updateSectionTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type UpdateSectionTemplateInput = z.infer<typeof updateSectionTemplateInputSchema>;

export interface SectionTemplate {
  id: string;
  name: string;
  blocks: BlockTree;
  createdAt: string;
  createdBy: string | null;
}
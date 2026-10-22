import type { BlockDefinition } from '../../types.js';
import { ParagraphBlock } from './Block.js';
import { ParagraphPanel } from './Panel.js';
import { paragraphDefaults } from './defaults.js';
import { paragraphSchema, type ParagraphProps } from './schema.js';

export const paragraphBlock: BlockDefinition<ParagraphProps> = {
  type: 'paragraph',
  label: 'ย่อหน้า',
  labelEn: 'Paragraph',
  category: 'text',
  version: 1,
  icon: 'AlignLeft',
  schema: paragraphSchema,
  defaults: paragraphDefaults,
  Block: ParagraphBlock,
  Panel: ParagraphPanel,
};

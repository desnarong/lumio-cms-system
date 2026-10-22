import type { BlockDefinition } from '../../types.js';
import { HeadingBlock } from './Block.js';
import { HeadingPanel } from './Panel.js';
import { headingDefaults } from './defaults.js';
import { headingSchema, type HeadingProps } from './schema.js';

export const headingBlock: BlockDefinition<HeadingProps> = {
  type: 'heading',
  label: 'หัวข้อ',
  labelEn: 'Heading',
  category: 'text',
  version: 1,
  icon: 'Heading',
  schema: headingSchema,
  defaults: headingDefaults,
  Block: HeadingBlock,
  Panel: HeadingPanel,
};

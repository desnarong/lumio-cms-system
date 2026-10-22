import type { BlockDefinition } from '../../types.js';
import { ImageBlock } from './Block.js';
import { ImagePanel } from './Panel.js';
import { imageDefaults } from './defaults.js';
import { imageSchema, type ImageProps } from './schema.js';

export const imageBlock: BlockDefinition<ImageProps> = {
  type: 'image',
  label: 'รูปภาพ',
  labelEn: 'Image',
  category: 'media',
  version: 1,
  icon: 'Image',
  schema: imageSchema,
  defaults: imageDefaults,
  Block: ImageBlock,
  Panel: ImagePanel,
};

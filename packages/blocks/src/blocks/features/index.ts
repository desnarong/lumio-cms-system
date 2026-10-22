import type { BlockDefinition } from '../../types.js';
import { FeaturesBlock } from './Block.js';
import { FeaturesPanel } from './Panel.js';
import { featuresDefaults } from './defaults.js';
import { featuresSchema, type FeaturesProps } from './schema.js';

export const featuresBlock: BlockDefinition<FeaturesProps> = {
  type: 'features',
  label: 'จุดเด่น (Features)',
  labelEn: 'Features',
  category: 'landing',
  version: 1,
  icon: 'Sparkles',
  schema: featuresSchema,
  defaults: featuresDefaults,
  Block: FeaturesBlock,
  Panel: FeaturesPanel,
};

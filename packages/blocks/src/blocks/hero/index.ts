import type { BlockDefinition } from '../../types.js';
import { HeroBlock } from './Block.js';
import { HeroPanel } from './Panel.js';
import { heroDefaults } from './defaults.js';
import { heroSchema, type HeroProps } from './schema.js';

export {
  HERO_FLOAT_BASE_HEIGHT,
  HERO_FLOAT_BASE_WIDTH,
  floatWidthPercent,
  floatXPercent,
  floatYPercent,
} from './schema.js';

export const heroBlock: BlockDefinition<HeroProps> = {
  type: 'hero',
  label: 'ส่วนต้อนรับ (Hero)',
  labelEn: 'Hero',
  category: 'landing',
  version: 1,
  icon: 'Layout',
  schema: heroSchema,
  defaults: heroDefaults,
  Block: HeroBlock,
  Panel: HeroPanel,
};

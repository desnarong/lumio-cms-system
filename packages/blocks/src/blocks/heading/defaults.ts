import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { HeadingProps } from './schema.js';

export const headingDefaults: BlockData<HeadingProps> = {
  version: 1,
  props: {
    text: 'หัวข้อของคุณ',
    level: 'h2',
    align: 'left',
    weight: 'semibold',
  },
  style: defaultBlockStyle,
};

import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { ImageProps } from './schema.js';

export const imageDefaults: BlockData<ImageProps> = {
  version: 1,
  props: {
    image: null,
    caption: '',
    aspect: 'wide',
    rounded: true,
    align: 'center',
    zoom: 100,
  },
  style: defaultBlockStyle,
};

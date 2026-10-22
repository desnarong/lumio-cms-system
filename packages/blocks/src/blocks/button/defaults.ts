import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { ButtonProps } from './schema.js';

export const buttonDefaults: BlockData<ButtonProps> = {
  version: 1,
  props: {
    label: 'ดูเพิ่มเติม',
    href: '/',
    variant: 'primary',
    size: 'md',
    external: false,
    align: 'left',
    fullWidth: false,
  },
  style: defaultBlockStyle,
};

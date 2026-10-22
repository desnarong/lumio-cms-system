import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { LanguageSwitcherProps } from './schema.js';

export const languageSwitcherDefaults: BlockData<LanguageSwitcherProps> = {
  version: 1,
  props: {
    label: 'ภาษา',
    display: 'inline',
    showUnavailable: false,
  },
  style: defaultBlockStyle,
};
import type { BlockDefinition } from '../../types.js';
import { LanguageSwitcherBlock } from './Block.js';
import { LanguageSwitcherPanel } from './Panel.js';
import { languageSwitcherDefaults } from './defaults.js';
import { languageSwitcherSchema, type LanguageSwitcherProps } from './schema.js';

export const languageSwitcherBlock: BlockDefinition<LanguageSwitcherProps> = {
  type: 'language-switcher',
  label: 'ตัวสลับภาษา',
  labelEn: 'Language switcher',
  category: 'interactive',
  version: 1,
  icon: 'Languages',
  schema: languageSwitcherSchema,
  defaults: languageSwitcherDefaults,
  Block: LanguageSwitcherBlock,
  Panel: LanguageSwitcherPanel,
};

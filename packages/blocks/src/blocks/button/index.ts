import type { BlockDefinition } from '../../types.js';
import { ButtonBlock } from './Block.js';
import { ButtonPanel } from './Panel.js';
import { buttonDefaults } from './defaults.js';
import { buttonSchema, type ButtonProps } from './schema.js';

export const buttonBlock: BlockDefinition<ButtonProps> = {
  type: 'button',
  label: 'ปุ่ม',
  labelEn: 'Button',
  category: 'interactive',
  version: 1,
  icon: 'MousePointerClick',
  schema: buttonSchema,
  defaults: buttonDefaults,
  Block: ButtonBlock,
  Panel: ButtonPanel,
};

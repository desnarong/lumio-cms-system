import type { BlockDefinition } from '../../types.js';
import { FormBlock } from './Block.js';
import { FormPanel } from './Panel.js';
import { formDefaults } from './defaults.js';
import { formSchema, type FormProps } from './schema.js';

export const formBlock: BlockDefinition<FormProps> = {
  type: 'form',
  label: 'ฟอร์มติดต่อ',
  labelEn: 'Contact form',
  category: 'interactive',
  version: 1,
  icon: 'Mail',
  schema: formSchema,
  defaults: formDefaults,
  Block: FormBlock,
  Panel: FormPanel,
};

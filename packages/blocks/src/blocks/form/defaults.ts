import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { FormProps } from './schema.js';

export const formDefaults: BlockData<FormProps> = {
  version: 1,
  props: {
    formId: '',
    heading: 'ติดต่อเรา',
    description: 'กรอกข้อมูลด้านล่าง แล้วทีมงานจะติดต่อกลับโดยเร็วที่สุด',
    submitLabel: 'ส่งข้อความ',
    align: 'left',
  },
  style: defaultBlockStyle,
};

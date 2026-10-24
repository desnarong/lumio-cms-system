import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { ParagraphProps } from './schema.js';

export const paragraphDefaults: BlockData<ParagraphProps> = {
  version: 1,
  props: {
    text: 'เล่าเรื่องราวของธุรกิจคุณให้ลูกค้าเข้าใจในไม่กี่บรรทัด เลือกใช้คำที่ลูกค้าของคุณพูดจริง',
    align: 'left',
    size: 'base',
    width: 'contained',
  },
  style: defaultBlockStyle,
};

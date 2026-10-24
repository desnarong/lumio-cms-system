import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';
import { TEXT_ALIGNMENTS } from '../common.js';

export const PARAGRAPH_SIZES = ['base', 'lg'] as const;
export type ParagraphSize = (typeof PARAGRAPH_SIZES)[number];

export const PARAGRAPH_WIDTHS = ['contained', 'full'] as const;
export type ParagraphWidth = (typeof PARAGRAPH_WIDTHS)[number];

export const paragraphPropsSchema = z.object({
  text: z
    .string()
    .default(
      'เล่าเรื่องราวของธุรกิจคุณให้ลูกค้าเข้าใจในไม่กี่บรรทัด เลือกใช้คำที่ลูกค้าของคุณพูดจริง',
    ),
  align: z.enum(TEXT_ALIGNMENTS).default('left'),
  size: z.enum(PARAGRAPH_SIZES).default('base'),
  width: z.enum(PARAGRAPH_WIDTHS).default('contained'),
});

export const paragraphSchema = z.object({
  version: z.literal(1),
  props: paragraphPropsSchema,
  style: blockStyleSchema.default({}),
});

export type ParagraphProps = z.infer<typeof paragraphPropsSchema>;

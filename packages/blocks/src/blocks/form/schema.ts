import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';

export const FORM_BLOCK_ALIGNMENTS = ['left', 'center'] as const;
export type FormBlockAlignment = (typeof FORM_BLOCK_ALIGNMENTS)[number];

export const formPropsSchema = z.object({
  /** Id of the managed form this block renders; empty until the user picks one. */
  formId: z.string().default(''),
  heading: z.string().default('ติดต่อเรา'),
  description: z.string().default('กรอกข้อมูลด้านล่าง แล้วทีมงานจะติดต่อกลับโดยเร็วที่สุด'),
  submitLabel: z.string().default('ส่งข้อความ'),
  align: z.enum(FORM_BLOCK_ALIGNMENTS).default('left'),
});

export const formSchema = z.object({
  version: z.literal(1),
  props: formPropsSchema,
  style: blockStyleSchema.default({}),
});

export type FormProps = z.infer<typeof formPropsSchema>;

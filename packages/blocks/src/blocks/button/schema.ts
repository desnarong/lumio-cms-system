import { z } from 'zod';
import { blockStyleSchema, safeLinkSchema } from '@lumio/shared';
import { BUTTON_SIZES, BUTTON_VARIANTS, TEXT_ALIGNMENTS } from '../common.js';

export const buttonPropsSchema = z.object({
  label: z.string().default('ดูเพิ่มเติม'),
  href: safeLinkSchema.default('/'),
  variant: z.enum(BUTTON_VARIANTS).default('primary'),
  size: z.enum(BUTTON_SIZES).default('md'),
  external: z.boolean().default(false),
  align: z.enum(TEXT_ALIGNMENTS).default('left'),
  fullWidth: z.boolean().default(false),
});

export const buttonSchema = z.object({
  version: z.literal(1),
  props: buttonPropsSchema,
  style: blockStyleSchema.default({}),
});

export type ButtonProps = z.infer<typeof buttonPropsSchema>;

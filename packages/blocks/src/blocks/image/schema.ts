import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';
import { IMAGE_ASPECTS, TEXT_ALIGNMENTS, imageValueSchema } from '../common.js';

export const imagePropsSchema = z.object({
  image: imageValueSchema.nullable().default(null),
  caption: z.string().default(''),
  aspect: z.enum(IMAGE_ASPECTS).default('auto'),
  rounded: z.boolean().default(true),
  align: z.enum(TEXT_ALIGNMENTS).default('center'),
  /** Zoom of the crop (percent); 100 shows the picture at cover size. */
  zoom: z.number().int().min(100).max(300).default(100),
});

export const imageSchema = z.object({
  version: z.literal(1),
  props: imagePropsSchema,
  style: blockStyleSchema.default({}),
});

export type ImageProps = z.infer<typeof imagePropsSchema>;

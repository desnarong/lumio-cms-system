import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';
import { TEXT_ALIGNMENTS } from '../common.js';

export const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4'] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export const headingPropsSchema = z.object({
  text: z.string().default('หัวข้อของคุณ'),
  level: z.enum(HEADING_LEVELS).default('h2'),
  align: z.enum(TEXT_ALIGNMENTS).default('left'),
});

export const headingSchema = z.object({
  version: z.literal(1),
  props: headingPropsSchema,
  style: blockStyleSchema.default({}),
});

export type HeadingProps = z.infer<typeof headingPropsSchema>;

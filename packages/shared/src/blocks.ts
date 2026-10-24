import { z } from 'zod';

export const SPACING_SCALE = ['none', 'sm', 'md', 'lg', 'xl'] as const;
export type SpacingScale = (typeof SPACING_SCALE)[number];

export const ANIMATIONS = ['none', 'fade-up', 'fade-in', 'zoom-in'] as const;
export type Animation = (typeof ANIMATIONS)[number];

export const BACKGROUNDS = ['none', 'surface', 'muted', 'accent', 'brand'] as const;
export type Background = (typeof BACKGROUNDS)[number];

export const visibilitySchema = z.object({
  mobile: z.boolean().default(true),
  tablet: z.boolean().default(true),
  desktop: z.boolean().default(true),
});

export const blockStyleSchema = z.object({
  paddingY: z.enum(SPACING_SCALE).default('md'),
  paddingX: z.enum(SPACING_SCALE).default('md'),
  background: z.enum(BACKGROUNDS).default('none'),
  visibility: visibilitySchema.default({}),
  animation: z.enum(ANIMATIONS).default('none'),
});

export type BlockStyle = z.infer<typeof blockStyleSchema>;

/** Style every block starts from; the editor stores only what the user changed. */
export const defaultBlockStyle: BlockStyle = blockStyleSchema.parse({});

export const BLOCK_EDITOR_MODES = ['simple', 'pro'] as const;
export type BlockEditorMode = (typeof BLOCK_EDITOR_MODES)[number];

/** Shared shape of a block's editable payload: schema version + props + style. */
export interface BlockData<Props> {
  version: number;
  props: Props;
  style: BlockStyle;
}

/**
 * Inline styling of one stretch of a text prop. Colours and sizes are token
 * names, never raw CSS, so a theme change still reaches every run. Offsets are
 * character positions in the plain text the block stores.
 */
export const TEXT_RUN_COLORS = ['primary', 'accent', 'muted', 'inherit'] as const;
export type TextRunColor = (typeof TEXT_RUN_COLORS)[number];

export const TEXT_RUN_SIZES = ['sm', 'base', 'lg', 'xl'] as const;
export type TextRunSize = (typeof TEXT_RUN_SIZES)[number];

export const textRunSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  color: z.enum(TEXT_RUN_COLORS).optional(),
  size: z.enum(TEXT_RUN_SIZES).optional(),
  /** Free colour from the editor's colour picker; wins over the token colour. */
  colorHex: z.string().regex(/^#[0-9a-f]{3,8}$/i).optional(),
  /** Free font size in px from the editor; wins over the token size. */
  sizePx: z.number().int().min(8).max(240).optional(),
});
export type TextRun = z.infer<typeof textRunSchema>;

/** Editable path (`props.text`) to the runs that style part of it. */
export const textStylesSchema = z.record(z.array(textRunSchema)).default({});
export type TextStyles = z.infer<typeof textStylesSchema>;

export interface BlockNode {
  id: string;
  type: string;
  version: number;
  props: Record<string, unknown>;
  style: BlockStyle;
  children: BlockNode[];
  /** Optional inline styling per text path; blocks without it render plain text. */
  textStyles?: TextStyles;
}

export const blockNodeSchema: z.ZodType<BlockNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    version: z.number().int().positive().default(1),
    props: z.record(z.unknown()).default({}),
    style: blockStyleSchema.default({}),
    children: z.array(blockNodeSchema).default([]),
    textStyles: textStylesSchema.optional(),
  }),
);

export const blockTreeSchema = z.array(blockNodeSchema);

export type BlockTree = z.infer<typeof blockTreeSchema>;

/** Minimal shape shared by every block definition in packages/blocks. */
export interface BlockDefinition<Props = Record<string, unknown>> {
  type: string;
  label: string;
  category: string;
  version: number;
  defaults: Props;
}

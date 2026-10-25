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
  /** Custom top/bottom spacing in px; wins over the spacing preset. */
  paddingYpx: z.number().int().min(0).max(240).optional(),
  /** Custom top spacing in px; wins over paddingYpx. */
  paddingTopPx: z.number().int().min(0).max(240).optional(),
  /** Custom bottom spacing in px; wins over paddingYpx. */
  paddingBottomPx: z.number().int().min(0).max(240).optional(),
  /** Moves the whole block up (negative) or down (positive) without resizing it. */
  marginTopPx: z.number().int().min(-1200).max(1200).optional(),
  /** Custom left/right spacing in px; wins over the spacing preset. */
  paddingXpx: z.number().int().min(0).max(240).optional(),
  background: z.enum(BACKGROUNDS).default('none'),
  /** Free background colour chosen in the editor; wins over `background`. */
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-f]{3,8}$/i)
    .optional(),
  /** Paint the background edge to edge, past the content column. */
  backgroundFullWidth: z.boolean().optional(),
  /** Where the block's text sits inside its column. */
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  /** Moves the block's text horizontally (px) without changing layout flow. */
  offsetX: z.number().int().min(-600).max(600).optional(),
  /** Moves the block's text vertically (px) without changing layout flow. */
  offsetY: z.number().int().min(-600).max(600).optional(),
  /** Scales the block's text (percent); 100 keeps the design's size. */
  textScale: z.number().int().min(50).max(300).optional(),
  /** Width the block may grow to (px); the content stays centred when narrower. */
  widthPx: z.number().int().min(160).max(2400).optional(),
  /** Smallest height of the whole block band (px), set by dragging its bottom edge. */
  heightPx: z.number().int().min(80).max(2400).optional(),
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

/** Where one editable text sits and how large it is, relative to its block. */
export const textLayoutSchema = z.object({
  x: z.number().int().min(-600).max(600).default(0),
  y: z.number().int().min(-600).max(600).default(0),
  /** Text size as a percentage; 100 keeps the block's own size. */
  scale: z.number().int().min(50).max(300).default(100),
});
export type TextLayout = z.infer<typeof textLayoutSchema>;

/** Editable path (`props.heading`) to its own position and size. */
export const textLayoutsSchema = z.record(textLayoutSchema).default({});
export type TextLayouts = z.infer<typeof textLayoutsSchema>;

export interface BlockNode {
  id: string;
  type: string;
  version: number;
  props: Record<string, unknown>;
  style: BlockStyle;
  children: BlockNode[];
  /** Optional inline styling per text path; blocks without it render plain text. */
  textStyles?: TextStyles;
  /** Optional per-text position/size, written by the editor's move controls. */
  textLayouts?: TextLayouts;
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
    textLayouts: textLayoutsSchema.optional(),
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

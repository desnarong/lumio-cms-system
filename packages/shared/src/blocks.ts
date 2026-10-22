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

export interface BlockNode {
  id: string;
  type: string;
  version: number;
  props: Record<string, unknown>;
  style: BlockStyle;
  children: BlockNode[];
}

export const blockNodeSchema: z.ZodType<BlockNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    version: z.number().int().positive().default(1),
    props: z.record(z.unknown()).default({}),
    style: blockStyleSchema.default({}),
    children: z.array(blockNodeSchema).default([]),
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

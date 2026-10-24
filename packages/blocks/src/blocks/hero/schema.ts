import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';
import { buttonValueSchema, imageValueSchema } from '../common.js';

export const HERO_LAYOUTS = ['overlay', 'centered', 'split-right', 'split-left'] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export const HERO_MAX_BUTTONS = 3;
export const HERO_MAX_FLOATS = 6;

/** One picture floating over the banner, positioned from the editor in pixels. */
export const heroFloatSchema = z.object({
  image: imageValueSchema.nullable().default(null),
  /** Optional picture swapped in while the visitor hovers over this cut-out. */
  hoverImage: imageValueSchema.nullable().default(null),
  /** Rendered width in pixels; 0 hides the picture. */
  width: z.number().int().min(0).max(2000).default(360),
  /** Which side the offset is measured from. */
  anchorX: z.enum(['left', 'right']).default('right'),
  /** Distance in pixels from that side; negative values overflow it. */
  x: z.number().int().min(-1200).max(2000).default(80),
  anchorY: z.enum(['top', 'bottom']).default('bottom'),
  /** Distance in pixels from that edge; negative values overflow it. */
  y: z.number().int().min(-1200).max(2000).default(0),
  shadow: z.boolean().default(true),
});
export type HeroFloat = z.infer<typeof heroFloatSchema>;

export const heroPropsSchema = z.object({
  layout: z.enum(HERO_LAYOUTS).default('split-right'),
  /** How large the headline is drawn; `xl` fills a wide desktop banner. */
  headingSize: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  /** `wide` lets the text start closer to the edge of a full-bleed banner. */
  contentWidth: z.enum(['normal', 'wide']).default('normal'),
  heading: z.string().default('กาแฟคั่วสดจากดอย ส่งตรงถึงบ้านคุณ'),
  subheading: z
    .string()
    .default('เลือกเมล็ดกาแฟจากสวนทางภาคเหนือ คั่วใหม่ทุกสัปดาห์ พร้อมส่งทั่วประเทศ'),
  buttons: z
    .array(buttonValueSchema)
    .max(HERO_MAX_BUTTONS)
    .default(() => [
      { label: 'สั่งซื้อเลย', href: '/shop', variant: 'primary' as const, external: false },
      { label: 'เรื่องราวของเรา', href: '/about', variant: 'ghost' as const, external: false },
    ]),
  image: imageValueSchema.nullable().default(null),
  /** Where the text sits vertically inside the banner. */
  contentAlign: z.enum(['top', 'center', 'bottom']).default('bottom'),
  /** `cover` fills the viewport; `image` keeps the picture's real aspect ratio. */
  heightMode: z.enum(['cover', 'image']).default('cover'),
  /** Background framing of the full-bleed banner. */
  backgroundZoom: z.number().int().min(100).max(300).default(100),
  backgroundX: z.number().int().min(0).max(100).default(50),
  backgroundY: z.number().int().min(0).max(100).default(50),
  /** 0 hides the dark scrim completely, 100 keeps the default gradient. */
  scrimOpacity: z.number().int().min(0).max(100).default(100),
  /** Up to three product cut-outs layered on top of the banner. */
  foregrounds: z.array(heroFloatSchema).max(HERO_MAX_FLOATS).default([]),
});

export const heroSchema = z.object({
  version: z.literal(1),
  props: heroPropsSchema,
  style: blockStyleSchema.default({}),
});

export type HeroProps = z.infer<typeof heroPropsSchema>;
export type HeroButton = z.infer<typeof buttonValueSchema>;

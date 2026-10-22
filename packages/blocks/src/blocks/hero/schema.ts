import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';
import { buttonValueSchema, imageValueSchema } from '../common.js';

export const HERO_LAYOUTS = ['centered', 'split-right', 'split-left'] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export const HERO_MAX_BUTTONS = 3;

export const heroPropsSchema = z.object({
  layout: z.enum(HERO_LAYOUTS).default('split-right'),
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
});

export const heroSchema = z.object({
  version: z.literal(1),
  props: heroPropsSchema,
  style: blockStyleSchema.default({}),
});

export type HeroProps = z.infer<typeof heroPropsSchema>;
export type HeroButton = z.infer<typeof buttonValueSchema>;

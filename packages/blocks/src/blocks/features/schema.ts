import { z } from 'zod';
import { blockStyleSchema, safeLinkSchema } from '@lumio/shared';
import { IMAGE_ASPECTS, imageValueSchema } from '../common.js';

export const FEATURE_COLUMNS = ['2', '3', '4'] as const;
export type FeatureColumns = (typeof FEATURE_COLUMNS)[number];

export const FEATURES_MAX_ITEMS = 6;

/** Line icons that also read well at card size and inside a tinted circle. */
export const FEATURE_ICON_NAMES = [
  'sparkles',
  'star',
  'grid',
  'package',
  'sun',
  'zap',
  'layers',
  'check',
  'home',
  'settings',
  'users',
  'mail',
  'map-pin',
  'book',
  'tag',
  'shield',
  'globe',
  'clock',
  'play',
  'image',
] as const;
export type FeatureIconName = (typeof FEATURE_ICON_NAMES)[number];

export const FEATURE_MEDIA_FITS = ['cover', 'contain'] as const;
export const FEATURE_MEDIA_POSITIONS = ['center', 'top', 'bottom'] as const;

export const featureItemSchema = z.object({
  /** Emoji fallback kept for older content; a line icon wins when chosen. */
  icon: z.string().default('★'),
  /** Hide the icon entirely, like a plain image-and-text card. */
  showIcon: z.boolean().default(true),
  /** Line icon from the Lumio icon set; empty renders the emoji fallback. */
  iconName: z.union([z.enum(FEATURE_ICON_NAMES), z.literal('')]).default(''),
  /** Picture used as the icon; wins over the line icon and the emoji. */
  iconImage: imageValueSchema.nullable().default(null),
  /** Diameter of the icon box in pixels, including an uploaded icon picture. */
  iconSize: z.number().int().min(16).max(160).default(48),
  title: z.string().default('จุดเด่นของร้าน'),
  description: z.string().default('อธิบายสั้น ๆ ว่าลูกค้าได้อะไรจากจุดเด่นนี้'),
  /** Optional picture shown above the content, edge to edge inside the card. */
  image: imageValueSchema.nullable().default(null),
  /** Optional second picture revealed when the visitor hovers over the card. */
  hoverImage: imageValueSchema.nullable().default(null),
  /** Crop used by the card picture; `cover` fills the card, `contain` shows all. */
  mediaAspect: z.enum(IMAGE_ASPECTS).default('wide'),
  mediaFit: z.enum(FEATURE_MEDIA_FITS).default('cover'),
  mediaPosition: z.enum(FEATURE_MEDIA_POSITIONS).default('center'),
  /** Where the card leads; empty means the card is not clickable. */
  link: safeLinkSchema.or(z.literal('')).default(''),
  /** Visible call to action; empty makes the whole card clickable instead. */
  buttonLabel: z.string().max(60).default(''),
});

export const FEATURE_TEXT_BACKGROUNDS = ['none', 'panel', 'full', 'fade'] as const;
export type FeatureTextBackground = (typeof FEATURE_TEXT_BACKGROUNDS)[number];

export const FEATURE_SOURCES = ['manual', 'promotions'] as const;
export type FeatureSource = (typeof FEATURE_SOURCES)[number];

export const featuresPropsSchema = z.object({
  heading: z.string().default('ทำไมลูกค้าถึงเลือกเรา'),
  subheading: z.string().default('สามสิ่งที่เราตั้งใจทำให้ดีที่สุดในทุกออเดอร์'),
  /** How wide the intro may grow before it wraps to another line. */
  subheadingWidth: z.enum(['normal', 'wide', 'full']).default('normal'),
  /** Bordered cards, or a flush image-and-text grid like a gallery. */
  cardStyle: z.enum(['card', 'plain']).default('card'),
  /**
   * Where the cards come from: typed here, or the live promotion list so an
   * expired offer disappears on its own.
   */
  source: z.enum(FEATURE_SOURCES).default('manual'),
  sourceLimit: z.number().int().min(1).max(FEATURES_MAX_ITEMS).default(3),
  /** Where the icon, title, description and button sit inside each card. */
  contentAlign: z.enum(['left', 'center', 'right']).default('left'),
  /** Paint the icon and text on top of the card picture. */
  textOverlay: z.boolean().default(false),
  /** Break the grid out of the content column and use the whole viewport. */
  fullWidth: z.boolean().default(false),
  /** Minimum card height in pixels; `0` follows the content. */
  cardHeight: z.number().int().min(0).max(1200).default(0),
  /** Panel, full-width band or top-fading backdrop behind the text. */
  textBackground: z.union([z.enum(FEATURE_TEXT_BACKGROUNDS), z.boolean()]).default('none'),
  /** Drop the card's bottom padding so the text sits on the bottom edge. */
  textFlushBottom: z.boolean().default(false),
  /** Keep the call to action hidden until the visitor hovers the card. */
  buttonVisibility: z.enum(['always', 'hover']).default('always'),
  /** Space between cards; `none` joins them edge to edge. */
  cardGap: z.enum(['none', 'sm', 'md', 'lg']).default('lg'),
  columns: z.enum(FEATURE_COLUMNS).default('3'),
  items: z
    .array(featureItemSchema)
    .min(1)
    .max(FEATURES_MAX_ITEMS)
    .default(() => [
      {
        icon: '☕',
        title: 'คั่วสดทุกสัปดาห์',
        description: 'คั่วเมล็ดใหม่ทุกสัปดาห์ ส่งถึงมือคุณภายใน 3 วันหลังคั่ว',
        image: null,
        link: '',
        buttonLabel: '',
      },
      {
        icon: '🚚',
        title: 'ส่งฟรีเมื่อซื้อครบ 500 บาท',
        description: 'จัดส่งทั่วประเทศด้วย Kerry และไปรษณีย์ไทย',
        image: null,
        link: '',
        buttonLabel: '',
      },
      {
        icon: '💬',
        title: 'ปรึกษาการชงได้ทุกวัน',
        description: 'ทีมบาริสต้าตอบคำถามเรื่องการชงผ่านแชททุกวัน 9:00-20:00 น.',
        image: null,
        link: '',
        buttonLabel: '',
      },
    ]),
});

export const featuresSchema = z.object({
  version: z.literal(1),
  props: featuresPropsSchema,
  style: blockStyleSchema.default({}),
});

export type FeatureItem = z.infer<typeof featureItemSchema>;
export type FeaturesProps = z.infer<typeof featuresPropsSchema>;

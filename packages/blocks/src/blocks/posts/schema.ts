import { z } from 'zod';
import { blockStyleSchema, safeLinkSchema } from '@lumio/shared';
import { imageValueSchema } from '../common.js';

export const POST_COLUMNS = ['1', '2', '3', '4'] as const;
export type PostColumns = (typeof POST_COLUMNS)[number];

export const POSTS_MAX_ITEMS = 12;

/** Where the cards come from: the editor's own list, or the site's published posts. */
export const POST_SOURCES = ['manual', 'latest'] as const;
export type PostSource = (typeof POST_SOURCES)[number];

/** One article card shown on the page. */
export const postCardSchema = z.object({
  image: imageValueSchema.nullable().default(null),
  /** Section label such as "ความรู้เรื่องกาแฟ" or "ข่าวร้าน". */
  category: z.string().max(60).default('บทความ'),
  title: z.string().default('หัวข้อบทความใหม่'),
  excerpt: z.string().default('เกริ่นนำสั้น ๆ ให้ผู้อ่านอยากกดอ่านต่อ'),
  /** Display date, already formatted for the site's language. */
  date: z.string().max(40).default(''),
  author: z.string().max(60).default(''),
  link: safeLinkSchema.or(z.literal('')).default(''),
  buttonLabel: z.string().max(40).default('อ่านต่อ'),
});

export const postsPropsSchema = z.object({
  heading: z.string().default('บทความล่าสุด'),
  subheading: z.string().default('เรื่องราวและความรู้ที่เราอยากแบ่งปัน'),
  columns: z.enum(POST_COLUMNS).default('3'),
  /**
   * "latest" follows the blog: a new post appears here on its own and a deleted
   * one disappears, so this block never shows stale cards.
   */
  source: z.enum(POST_SOURCES).default('manual'),
  /** How many published posts a "latest" block shows. */
  sourceLimit: z.number().int().min(1).max(POSTS_MAX_ITEMS).default(3),
  showImage: z.boolean().default(true),
  showExcerpt: z.boolean().default(true),
  showDate: z.boolean().default(true),
  items: z
    .array(postCardSchema)
    .max(POSTS_MAX_ITEMS)
    .default(() => [
      {
        image: null,
        category: 'ความรู้เรื่องกาแฟ',
        title: 'คั่วอ่อน คั่วกลาง คั่วเข้ม ต่างกันอย่างไร',
        excerpt: 'เลือกความคั่วให้เข้ากับเมล็ดและวิธีชงของคุณ',
        date: '12 ต.ค. 2026',
        author: 'ทีมบาริสต้า',
        link: '/posts',
        buttonLabel: 'อ่านต่อ',
      },
      {
        image: null,
        category: 'วิธีชง',
        title: 'Pour Over ให้หอมชัดใน 4 ขั้นตอน',
        excerpt: 'เทน้ำอย่างไรให้น้ำกาแฟสม่ำเสมอและไม่ขม',
        date: '5 ต.ค. 2026',
        author: 'ทีมบาริสต้า',
        link: '/posts',
        buttonLabel: 'อ่านต่อ',
      },
      {
        image: null,
        category: 'เรื่องเล่าจากสวน',
        title: 'หนึ่งวันกับชาวสวนกาแฟบนดอย',
        excerpt: 'เบื้องหลังเมล็ดกาแฟทุกถุงที่ส่งถึงมือคุณ',
        date: '28 ก.ย. 2026',
        author: 'ทีมงาน Lumio',
        link: '/posts',
        buttonLabel: 'อ่านต่อ',
      },
    ]),
});

export const postsSchema = z.object({
  version: z.literal(1),
  props: postsPropsSchema,
  style: blockStyleSchema.default({}),
});

export type PostCard = z.infer<typeof postCardSchema>;
export type PostsProps = z.infer<typeof postsPropsSchema>;

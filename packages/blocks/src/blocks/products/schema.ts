import { z } from 'zod';
import { blockStyleSchema, safeLinkSchema } from '@lumio/shared';
import { imageValueSchema } from '../common.js';

export const PRODUCT_COLUMNS = ['2', '3', '4'] as const;
export type ProductColumns = (typeof PRODUCT_COLUMNS)[number];

export const PRODUCTS_MAX_ITEMS = 12;

export const PRODUCT_CARD_STYLES = ['card', 'plain'] as const;
export type ProductCardStyle = (typeof PRODUCT_CARD_STYLES)[number];

/** One product card shown on the page. */
export const productCardSchema = z.object({
  image: imageValueSchema.nullable().default(null),
  name: z.string().default('สินค้าใหม่'),
  description: z.string().default('อธิบายสินค้าสั้น ๆ ให้ลูกค้าเห็นคุณค่า'),
  /** Price in the shop currency; 0 shows "สอบถามราคา" instead. */
  price: z.number().min(0).default(0),
  /** Optional original price, shown struck through when higher than `price`. */
  compareAtPrice: z.number().min(0).optional(),
  currency: z.string().max(4).default('฿'),
  /** Small ribbon such as "ใหม่" or "ขายดี". */
  badge: z.string().max(40).default(''),
  link: safeLinkSchema.or(z.literal('')).default(''),
  buttonLabel: z.string().max(40).default('ดูสินค้า'),
  soldOut: z.boolean().default(false),
});

export const productsPropsSchema = z.object({
  heading: z.string().default('สินค้าแนะนำ'),
  subheading: z.string().default('คัดสินค้าขายดีที่ลูกค้าประทับใจมาให้เลือก'),
  columns: z.enum(PRODUCT_COLUMNS).default('3'),
  cardStyle: z.enum(PRODUCT_CARD_STYLES).default('card'),
  showPrice: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  items: z
    .array(productCardSchema)
    .min(1)
    .max(PRODUCTS_MAX_ITEMS)
    .default(() => [
      {
        image: null,
        name: 'กาแฟคั่วอ่อน เอสเปรสโซ่',
        description: 'หอมผลไม้ เปรี้ยวเบา เหมาะกับกาแฟดำ',
        price: 320,
        compareAtPrice: 380,
        currency: '฿',
        badge: 'ขายดี',
        link: '/shop',
        buttonLabel: 'ดูสินค้า',
        soldOut: false,
      },
      {
        image: null,
        name: 'กาแฟคั่วกลาง เฮาส์เบลนด์',
        description: 'สมดุลทั้งหอมและเข้ม ชงได้ทุกวิธี',
        price: 290,
        currency: '฿',
        badge: '',
        link: '/shop',
        buttonLabel: 'ดูสินค้า',
        soldOut: false,
      },
      {
        image: null,
        name: 'กาแฟคั่วเข้ม ดอยสูง',
        description: 'เข้มข้น กลิ่นโกโก้ เหมาะกับนม',
        price: 350,
        currency: '฿',
        badge: 'ใหม่',
        link: '/shop',
        buttonLabel: 'ดูสินค้า',
        soldOut: false,
      },
    ]),
});

export const productsSchema = z.object({
  version: z.literal(1),
  props: productsPropsSchema,
  style: blockStyleSchema.default({}),
});

export type ProductCard = z.infer<typeof productCardSchema>;
export type ProductsProps = z.infer<typeof productsPropsSchema>;

import { z } from 'zod';
import { blockStyleSchema } from '@lumio/shared';

export const FEATURE_COLUMNS = ['2', '3', '4'] as const;
export type FeatureColumns = (typeof FEATURE_COLUMNS)[number];

export const FEATURES_MAX_ITEMS = 6;

export const featureItemSchema = z.object({
  icon: z.string().default('★'),
  title: z.string().default('จุดเด่นของร้าน'),
  description: z.string().default('อธิบายสั้น ๆ ว่าลูกค้าได้อะไรจากจุดเด่นนี้'),
});

export const featuresPropsSchema = z.object({
  heading: z.string().default('ทำไมลูกค้าถึงเลือกเรา'),
  subheading: z.string().default('สามสิ่งที่เราตั้งใจทำให้ดีที่สุดในทุกออเดอร์'),
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
      },
      {
        icon: '🚚',
        title: 'ส่งฟรีเมื่อซื้อครบ 500 บาท',
        description: 'จัดส่งทั่วประเทศด้วย Kerry และไปรษณีย์ไทย',
      },
      {
        icon: '💬',
        title: 'ปรึกษาการชงได้ทุกวัน',
        description: 'ทีมบาริสต้าตอบคำถามเรื่องการชงผ่านแชททุกวัน 9:00-20:00 น.',
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

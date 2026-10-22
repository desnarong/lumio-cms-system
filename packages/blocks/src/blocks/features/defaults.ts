import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { FeaturesProps } from './schema.js';

export const featuresDefaults: BlockData<FeaturesProps> = {
  version: 1,
  props: {
    heading: 'ทำไมลูกค้าถึงเลือกเรา',
    subheading: 'สามสิ่งที่เราตั้งใจทำให้ดีที่สุดในทุกออเดอร์',
    columns: '3',
    items: [
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
    ],
  },
  style: defaultBlockStyle,
};

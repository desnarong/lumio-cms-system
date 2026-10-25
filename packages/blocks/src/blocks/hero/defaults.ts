import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { HeroProps } from './schema.js';

export const heroDefaults: BlockData<HeroProps> = {
  version: 1,
  props: {
    layout: 'split-right',
    headingSize: 'md',
    contentWidth: 'normal',
    heading: 'กาแฟคั่วสดจากดอย ส่งตรงถึงบ้านคุณ',
    subheadingWidth: 60,
    splitGap: 4,
    subheading: 'เลือกเมล็ดกาแฟจากสวนทางภาคเหนือ คั่วใหม่ทุกสัปดาห์ พร้อมส่งทั่วประเทศ',
    note: 'ส่งฟรีเมื่อสั่งครบ 500 บาท',
    buttons: [
      { label: 'สั่งซื้อเลย', href: '/shop', variant: 'primary', external: false },
      { label: 'เรื่องราวของเรา', href: '/about', variant: 'ghost', external: false },
    ],
    image: null,
    hoverImage: null,
    heightMode: 'cover',
    contentAlign: 'bottom',
    backgroundZoom: 100,
    backgroundX: 50,
    backgroundY: 50,
    scrimOpacity: 100,
    foregrounds: [],
  },
  style: { ...defaultBlockStyle, paddingY: 'xl' },
};

import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { PostsProps } from './schema.js';

export const postsDefaults: BlockData<PostsProps> = {
  version: 1,
  props: {
    heading: 'บทความล่าสุด',
    subheading: 'เรื่องราวและความรู้ที่เราอยากแบ่งปัน',
    columns: '3',
    source: 'manual',
    sourceLimit: 3,
    showImage: true,
    showExcerpt: true,
    showDate: true,
    items: [
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
    ],
  },
  style: defaultBlockStyle,
};

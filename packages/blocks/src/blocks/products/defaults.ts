import { defaultBlockStyle, type BlockData } from '@lumio/shared';
import type { ProductsProps } from './schema.js';

export const productsDefaults: BlockData<ProductsProps> = {
  version: 1,
  props: {
    heading: 'สินค้าแนะนำ',
    subheading: 'คัดสินค้าขายดีที่ลูกค้าประทับใจมาให้เลือก',
    columns: '3',
    cardStyle: 'card',
    showPrice: true,
    showDescription: true,
    items: [
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
    ],
  },
  style: defaultBlockStyle,
};

import { describe, expect, it } from 'vitest';
import { productCopyBlocks } from './product-copy';

describe('productCopyBlocks', () => {
  it('keeps paragraphs and bullet lists apart', () => {
    const blocks = productCopyBlocks(`แพ็กสุดคุ้ม ซื้อ 2 แถม 1

• หลอดไฟประหยัดพลังงาน
• แสงเหลือง Warm White 4000K

รับประกัน 1 ปี`);

    expect(blocks).toEqual([
      { type: 'paragraph', text: 'แพ็กสุดคุ้ม ซื้อ 2 แถม 1' },
      { type: 'list', items: ['หลอดไฟประหยัดพลังงาน', 'แสงเหลือง Warm White 4000K'] },
      { type: 'paragraph', text: 'รับประกัน 1 ปี' },
    ]);
  });

  it('joins wrapped lines into one paragraph', () => {
    expect(productCopyBlocks('บรรทัดแรก\nบรรทัดต่อ')).toEqual([
      { type: 'paragraph', text: 'บรรทัดแรก บรรทัดต่อ' },
    ]);
  });

  it('accepts the different bullets sellers paste in', () => {
    expect(productCopyBlocks('- ข้อหนึ่ง\n● ข้อสอง\n* ข้อสาม')).toEqual([
      { type: 'list', items: ['ข้อหนึ่ง', 'ข้อสอง', 'ข้อสาม'] },
    ]);
  });

  it('returns nothing for blank copy', () => {
    expect(productCopyBlocks('  \n\n ')).toEqual([]);
  });
});

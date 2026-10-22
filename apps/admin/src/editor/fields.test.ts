import { describe, expect, it } from 'vitest';
import { labelForPath } from './fields.js';

describe('labelForPath', () => {
  it('names the simple prop paths in business wording', () => {
    expect(labelForPath('props.text')).toBe('ข้อความ');
    expect(labelForPath('props.heading')).toBe('หัวข้อ');
    expect(labelForPath('props.subheading')).toBe('คำโปรย');
    expect(labelForPath('props.buttons[0].label')).toBe('ปุ่ม 1: ข้อความบนปุ่ม');
  });

  it('numbers repeated items and keeps the parent as context', () => {
    expect(labelForPath('props.items[1].title')).toBe('รายการ 2: ชื่อ');
    expect(labelForPath('props.items[0].description')).toBe('รายการ 1: รายละเอียด');
    expect(labelForPath('props.items[0]')).toBe('รายการ 1');
  });

  it('falls back to a readable name for unknown keys', () => {
    expect(labelForPath('props.someCustomKey')).toBe('Some custom key');
    expect(labelForPath('props.image.caption')).toBe('คำอธิบายใต้รูป');
  });
});
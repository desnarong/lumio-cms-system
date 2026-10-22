import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MediaItem } from '@lumio/shared';
import { createDemoAiApi } from '../ai/demo.js';
import { MediaLibraryBody, formatFileSize, mediaStatusLabel } from './MediaLibraryBody.js';

const item = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: 'media-1',
  url: 'data:image/svg+xml;utf8,<svg/>',
  srcSet: null,
  filename: 'hero.jpg',
  mime: 'image/jpeg',
  sizeBytes: 2048,
  width: 1600,
  height: 900,
  alt: 'บรรยากาศหน้าร้านกาแฟบ้านดอย',
  folder: 'hero',
  focalPoint: null,
  variants: [],
  status: 'ready',
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  ...overrides,
});

const render = (props: Partial<Parameters<typeof MediaLibraryBody>[0]> = {}): string =>
  renderToStaticMarkup(
    <MediaLibraryBody
      items={[item(), item({ id: 'media-2', filename: 'logo.png', alt: 'โลโก้ร้าน' })]}
      folders={['brand', 'hero']}
      query=""
      folder={null}
      loading={false}
      error={null}
      uploading={false}
      selectedId="media-1"
      onQueryChange={() => undefined}
      onFolderChange={() => undefined}
      onSelect={() => undefined}
      onUpload={() => undefined}
      onDelete={() => undefined}
      onSaveAlt={() => undefined}
      {...props}
    />,
  );

describe('focal point control', () => {
  it('stays hidden while the screen cannot save it', () => {
    expect(render()).not.toContain('จุดโฟกัสของภาพ');
  });

  it('shows the two sliders at the point the image already uses', () => {
    const html = render({
      items: [item({ focalPoint: { x: 0.25, y: 0.75 } })],
      onSaveFocalPoint: () => undefined,
    });

    expect(html).toContain('จุดโฟกัสของภาพ');
    expect(html).toContain('value="25"');
    expect(html).toContain('value="75"');
    expect(html).toContain('object-position:25% 75%');
    expect(html).toContain('บันทึกจุดโฟกัส');
    expect(html).toContain('กลับไปตรงกลาง');
  });

  it('starts a fresh image from the centre', () => {
    const html = render({ onSaveFocalPoint: () => undefined });

    expect(html).toContain('value="50"');
    expect(html).toContain('object-position:50% 50%');
  });
});

describe('crop control', () => {
  it('stays hidden while the screen cannot save it', () => {
    expect(render()).not.toContain('ครอปรูป');
  });

  it('shows the window the image already uses', () => {
    const html = render({
      items: [item({ crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.4 } })],
      onSaveCrop: () => undefined,
    });

    expect(html).toContain('ครอปรูป');
    expect(html).toContain('เริ่มจากซ้าย 10%');
    expect(html).toContain('เริ่มจากบน 20%');
    expect(html).toContain('ความกว้าง 50%');
    expect(html).toContain('ความสูง 40%');
    expect(html).toContain('left:10%');
    expect(html).toContain('width:50%');
    expect(html).toContain('ครอปรูปนี้');
    expect(html).toContain('กลับไปใช้รูปเต็ม');
  });

  it('starts from the whole picture', () => {
    const html = render({ onSaveCrop: () => undefined });

    expect(html).toContain('เริ่มจากซ้าย 0%');
    expect(html).toContain('ความกว้าง 100%');
    expect(html).toMatch(/ui-button--ghost[^>]*disabled/);
  });
});

describe('MediaLibraryBody', () => {
  it('offers search, folder filtering and upload with the accepted types', () => {
    const html = render();

    expect(html).toContain('ค้นหารูป');
    expect(html).toContain('ทุกโฟลเดอร์');
    expect(html).toContain('brand');
    expect(html).toContain('อัปโหลดรูป');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/avif,image/gif"');
    expect(html).toContain('ไฟล์ละไม่เกิน 15 MB');
  });

  it('shows every image with its alt text, size and folder details', () => {
    const html = render();

    expect(html.match(/media-card__name/g)).toHaveLength(2);
    expect(html).toContain('บรรยากาศหน้าร้านกาแฟบ้านดอย');
    expect(html).toContain('2 KB');
    expect(html).toContain('1600 × 900');
  });

  it('lets the user describe the selected image', () => {
    const html = render();

    expect(html).toContain('คำอธิบายรูป (alt)');
    expect(html).toContain('บันทึกคำอธิบาย');
    expect(html).toContain('ลบรูปนี้');
  });

  it('shows a placeholder instead of an empty grid', () => {
    const html = render({ items: [], selectedId: null });

    expect(html).toContain('ยังไม่มีรูปในโฟลเดอร์นี้');
    expect(html).toContain('อัปโหลดรูปแรกได้เลย');
    expect(html).not.toContain('media-card__name');
  });

  it('keeps the retry action close when loading fails', () => {
    const html = render({ error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองอีกครั้ง' });

    expect(html).toContain('เปิดคลังรูปภาพไม่สำเร็จ');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('only offers the primary pick action in pick mode, and only with a selection', () => {
    expect(render()).not.toContain('ใช้รูปนี้');
    expect(render({ pickMode: true, selectedId: null })).toContain('ใช้รูปนี้');
    expect(render({ pickMode: true, selectedId: null })).toContain('disabled');
  });

  it('renders one primary button at most when picking', () => {
    expect(render({ pickMode: true }).match(/ui-button--primary/g)).toHaveLength(1);
  });

  it('uses business language instead of technical jargon', () => {
    const html = render({ pickMode: true });
    for (const jargon of ['CDN', 'Bucket', 'S3', 'MIME', 'WebP']) {
      expect(html).not.toContain(jargon);
    }
  });

  it('labels rows that are still being prepared', () => {
    expect(mediaStatusLabel(item({ status: 'processing' }))).toBe('กำลังเตรียมไฟล์ย่อ');
    expect(mediaStatusLabel(item({ status: 'failed' }))).toBe('เตรียมไฟล์ย่อไม่สำเร็จ');
    expect(mediaStatusLabel(item())).toBeNull();
    expect(render({ items: [item({ status: 'processing' })] })).toContain('กำลังเตรียมไฟล์ย่อ');
  });

  it('formats file sizes for people', () => {
    expect(formatFileSize(null)).toBe('ไม่ทราบขนาด');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('offers to describe every image that has none when the assistant is there', () => {
    const withAi = render({ ai: createDemoAiApi() });

    expect(withAi).toContain('ใส่คำอธิบายให้รูปที่ยังไม่มี');
    expect(render()).not.toContain('ใส่คำอธิบายให้รูปที่ยังไม่มี่');
  });
});


describe('bulk selection', () => {
  it('adds a checkbox per image only when bulk editing is available', () => {
    expect(render()).not.toContain('media-card__check');

    const html = render({ onBulkUpdate: () => undefined });
    expect(html.match(/media-card__check/g) ?? []).toHaveLength(2);
    expect(html).toContain('เลือก hero.jpg');
  });

  it('hides the bulk bar until something is selected', () => {
    const html = render({ onBulkUpdate: () => undefined });
    expect(html).not.toContain('แก้คำอธิบาย');
    expect(html).not.toContain('ย้ายโฟลเดอร์');
  });
});

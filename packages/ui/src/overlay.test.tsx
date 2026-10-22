import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Drawer } from './drawer.js';
import { Modal } from './modal.js';
import { Popover } from './popover.js';
import { Tooltip } from './tooltip.js';

describe('Modal', () => {
  it('renders nothing while closed', () => {
    expect(renderToStaticMarkup(<Modal open={false} title="ลบหน้า" />)).toBe('');
  });

  it('renders an accessible dialog with header, body and footer', () => {
    const html = renderToStaticMarkup(
      <Modal
        open
        title="ลบหน้า"
        description="การลบนี้ยกเลิกได้"
        footer={<button type="button">ยืนยัน</button>}
        onClose={() => {}}
      >
        เนื้อหา
      </Modal>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="ลบหน้า"');
    expect(html).toContain('ui-modal--md');
    expect(html).toContain('การลบนี้ยกเลิกได้');
    expect(html).toContain('ยืนยัน');
  });
});

describe('Drawer', () => {
  it('renders nothing while closed', () => {
    expect(renderToStaticMarkup(<Drawer open={false} />)).toBe('');
  });

  it('slides in from the requested side', () => {
    const html = renderToStaticMarkup(
      <Drawer open side="right" size="lg" title="ตั้งค่า Hero" onClose={() => {}}>
        แผงด้านข้าง
      </Drawer>,
    );
    expect(html).toContain('ui-drawer--right');
    expect(html).toContain('ui-drawer--lg');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('ตั้งค่า Hero');
  });
});

describe('Popover', () => {
  it('hides the panel until it is open', () => {
    const html = renderToStaticMarkup(
      <Popover trigger="⋯" triggerLabel="ตัวเลือก">
        เมนู
      </Popover>,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('ui-popover__panel');
  });

  it('shows the panel when open', () => {
    const html = renderToStaticMarkup(
      <Popover trigger="⋯" triggerLabel="ตัวเลือก" defaultOpen align="end">
        เมนู
      </Popover>,
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('ui-popover__panel--end');
    expect(html).toContain('เมนู');
  });
});

describe('Tooltip', () => {
  it('renders a tooltip role with placement data', () => {
    const html = renderToStaticMarkup(
      <Tooltip content="บันทึกทันที" placement="bottom">
        <button type="button">บันทึก</button>
      </Tooltip>,
    );
    expect(html).toContain('data-placement="bottom"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('บันทึกทันที');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Banner } from './banner.js';
import { EmptyState } from './empty-state.js';
import { Progress } from './progress.js';
import { Skeleton } from './skeleton.js';
import { Toast, ToastProvider, useToast } from './toast.js';

describe('Banner', () => {
  it('renders the tone, title and dismiss button', () => {
    const html = renderToStaticMarkup(
      <Banner tone="warning" title="ยังไม่ได้เผยแพร่" onDismiss={() => {}}>
        กดเผยแพร่เพื่อให้ลูกค้าเห็น
      </Banner>,
    );
    expect(html).toContain('ui-banner--warning');
    expect(html).toContain('role="status"');
    expect(html).toContain('ยังไม่ได้เผยแพร่');
    expect(html).toContain('aria-label="ปิด"');
  });
});

describe('Toast', () => {
  it('renders an undo action and a close button', () => {
    const html = renderToStaticMarkup(
      <Toast
        tone="danger"
        title="ลบหน้าแล้ว"
        description="ลบหน้า บริการ เรียบร้อย"
        action={{ label: 'เลิกทำ' }}
        onDismiss={() => {}}
      />,
    );
    expect(html).toContain('ui-toast--danger');
    expect(html).toContain('เลิกทำ');
    expect(html).toContain('aria-label="ปิด"');
  });

  it('provides an empty viewport and children through the provider', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <span>เนื้อหา</span>
      </ToastProvider>,
    );
    expect(html).toContain('ui-toast-viewport');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('เนื้อหา');
  });

  it('throws when useToast is used outside the provider', () => {
    const Probe = () => {
      useToast();
      return null;
    };
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(/ToastProvider/);
  });
});

describe('Skeleton', () => {
  it('renders one shimmer block by default', () => {
    const html = renderToStaticMarkup(<Skeleton width={120} height={40} />);
    expect(html).toContain('ui-skeleton--block');
    expect(html).toContain('width:120px');
  });

  it('renders multiple lines for text skeletons', () => {
    const html = renderToStaticMarkup(<Skeleton shape="text" lines={3} />);
    expect(html).toContain('ui-skeleton-group');
    expect(html.match(/ui-skeleton--text/g)?.length).toBe(3);
    expect(html).toContain('aria-hidden="true"');
  });
});

describe('Progress', () => {
  it('exposes progressbar semantics', () => {
    const html = renderToStaticMarkup(<Progress value={30} max={60} label="กำลังอัปโหลด" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="30"');
    expect(html).toContain('aria-valuemax="60"');
    expect(html).toContain('width:50%');
  });

  it('omits the value when indeterminate', () => {
    const html = renderToStaticMarkup(<Progress indeterminate label="กำลังประมวลผล" />);
    expect(html).not.toContain('aria-valuenow');
    expect(html).toContain('ui-progress__bar--indeterminate');
  });
});

describe('EmptyState', () => {
  it('renders the message and a next step', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="ยังไม่มีหน้าเว็บ"
        description="เริ่มจากเทมเพลตสำเร็จรูปได้เลย"
        action={<button type="button">สร้างหน้าแรก</button>}
      />,
    );
    expect(html).toContain('ยังไม่มีหน้าเว็บ');
    expect(html).toContain('สร้างหน้าแรก');
    expect(html).toContain('ui-empty-state--neutral');
  });

  it('uses the error tone for failures', () => {
    const html = renderToStaticMarkup(<EmptyState tone="error" title="โหลดไม่สำเร็จ" />);
    expect(html).toContain('ui-empty-state--error');
  });
});

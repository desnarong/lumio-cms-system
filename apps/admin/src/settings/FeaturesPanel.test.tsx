import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FeatureFlagView } from '@lumio/shared';
import { FeaturesView } from './FeaturesPanel.js';

const items = (overrides: FeatureFlagView[] = []): FeatureFlagView[] => [
  { key: 'ai', enabled: true, lockedByPlatform: false, lockedByLicense: false },
  { key: 'commerce', enabled: true, lockedByPlatform: false, lockedByLicense: false },
  { key: 'newsletter', enabled: false, lockedByPlatform: false, lockedByLicense: false },
  ...overrides,
];

const props = (overrides: Partial<Parameters<typeof FeaturesView>[0]> = {}) => ({
  items: items(),
  busy: null,
  error: null,
  onToggle: vi.fn(),
  ...overrides,
});

describe('FeaturesView', () => {
  it('names each add-on in business words and shows its purpose', () => {
    const html = renderToStaticMarkup(<FeaturesView {...props()} />);

    expect(html).toContain('ผู้ช่วย AI');
    expect(html).toContain('ร้านค้า');
    expect(html).toContain('สินค้า ตะกร้า คำสั่งซื้อ');
    expect(html).not.toContain('feature.ai');
  });

  it('marks a capability the platform closed and disables its switch', () => {
    const html = renderToStaticMarkup(
      <FeaturesView
        {...props({
          items: items([
            { key: 'apps', enabled: false, lockedByPlatform: true, lockedByLicense: false },
          ]),
        })}
      />,
    );

    expect(html).toContain('ปิดโดยผู้ดูแลระบบ');
    expect(html).toMatch(/disabled/);
  });

  it('locks a paid capability the licence does not include', () => {
    const html = renderToStaticMarkup(
      <FeaturesView
        {...props({
          items: items([
            { key: 'membership', enabled: false, lockedByPlatform: false, lockedByLicense: true },
          ]),
        })}
      />,
    );

    expect(html).toContain('ต้องมีไลเซนส์ที่ครอบคลุมส่วนนี้');
    expect(html).toMatch(/disabled/);
  });

  it('shows the reason when saving a choice failed', () => {
    const html = renderToStaticMarkup(
      <FeaturesView {...props({ error: 'บันทึกไม่สำเร็จ ลองอีกครั้ง' })} />,
    );

    expect(html).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
  });

  it('disables every switch while one is being saved', () => {
    const html = renderToStaticMarkup(<FeaturesView {...props({ busy: 'commerce' })} />);

    expect(html.match(/disabled/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});

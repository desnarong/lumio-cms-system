import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { communityStatus, licenseStatusOfPayload, type LicenseView } from '@lumio/shared';
import { MessagesProvider } from '@lumio/ui';
import { LicenseDetails } from './LicensePanel.js';

const NOW = Math.floor(Date.now() / 1000);

const pro = (overrides: Partial<LicenseView> = {}): LicenseView => ({
  ...licenseStatusOfPayload({
    v: 1,
    sub: 'บริษัท ตัวอย่าง จำกัด',
    plan: 'pro',
    features: ['membership', 'marketplace'],
    seats: 3,
    iat: NOW,
    exp: NOW + 365 * 86_400,
  }),
  source: 'database',
  installedAt: '2026-10-30T00:00:00.000Z',
  ...overrides,
});

const community = (): LicenseView => ({
  ...communityStatus('missing'),
  source: 'none',
  installedAt: null,
});

const render = (view: LicenseView, overrides: Partial<Parameters<typeof LicenseDetails>[0]> = {}) =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <LicenseDetails
        view={view}
        canManage
        token=""
        busy={null}
        error={null}
        onTokenChange={vi.fn()}
        onInstall={vi.fn()}
        onRemove={vi.fn()}
        onRefresh={vi.fn()}
        {...overrides}
      />
    </MessagesProvider>,
  );

describe('LicenseDetails', () => {
  it('starts as Community and still offers the install box', () => {
    const html = render(community());

    expect(html).toContain('Community');
    expect(html).toContain('ยังไม่ได้ติดตั้ง');
    expect(html).toContain('เพิ่มไลเซนส์');
    expect(html).toContain('ไม่มีวันหมดอายุ');
  });

  it('names the features a Pro licence unlocks in business words', () => {
    const html = render(pro());

    expect(html).toContain('Pro');
    expect(html).toContain('สมาชิกและเพย์วอลล์');
    expect(html).toContain('ตลาดบล็อก');
    expect(html).toContain('บริษัท ตัวอย่าง จำกัด');
    expect(html).not.toContain('license.feature.marketplace');
  });

  it('shows the remove button only for a licence installed on this screen', () => {
    expect(render(pro())).toContain('ถอดไลเซนส์');
    expect(render(community())).not.toContain('ถอดไลเซนส์');
  });

  it('explains that a licence pinned in .env wins over this screen', () => {
    const html = render(pro({ source: 'env', installedAt: null }));

    expect(html).toContain('ไลเซนส์นี้ตั้งไว้ที่เครื่องเซิร์ฟเวอร์');
    expect(html).not.toContain('เพิ่มไลเซนส์');
  });

  it('warns in plain language when the licence is not activated yet', () => {
    const html = render(
      pro({
        valid: false,
        edition: 'community',
        plan: 'community',
        reason: 'not_activated',
        features: [],
        mode: 'online',
      }),
    );

    expect(html).toContain('ไลเซนส์นี้ยังไม่ได้เปิดใช้งาน');
  });

  it('offers a renewal button for an online licence', () => {
    const html = render(pro({ mode: 'online', bound: true }));

    expect(html).toContain('ต่ออายุตอนนี้');
    expect(html).toContain('ออนไลน์');
  });

  it('hides the install box from a role that cannot manage the licence', () => {
    const html = render(community(), { canManage: false });

    expect(html).not.toContain('เพิ่มไลเซนส์');
  });

  it('shows the server message when installing failed', () => {
    const html = render(community(), { error: 'ลายเซ็นของไลเซนส์ไม่ถูกต้อง' });

    expect(html).toContain('ลายเซ็นของไลเซนส์ไม่ถูกต้อง');
  });
});

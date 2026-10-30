import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MarketplaceView as MarketplaceViewData } from '@lumio/shared';
import { MessagesProvider } from '@lumio/ui';
import { MarketplaceView } from './MarketplacePage.js';
import { createDemoMarketplaceApi } from './api.js';

const viewData = (): MarketplaceViewData => ({
  catalog: [
    {
      key: 'lumio-launch',
      name: 'ชุดเปิดตัวเว็บ',
      nameEn: 'Website launch pack',
      description: 'หน้าแรกพร้อมใช้',
      descriptionEn: 'A ready home page',
      version: '1.1.0',
      author: 'Lumio',
      homepage: null,
      license: 'CC BY 4.0',
      source: 'official',
      sectionCount: 2,
      installed: false,
      installedVersion: null,
      enabled: false,
      updateAvailable: false,
    },
  ],
  installed: [
    {
      key: 'vendored',
      name: 'ชุดจากผู้พัฒนาภายนอก',
      version: '1.0.0',
      source: 'external',
      enabled: true,
      sectionCount: 1,
      signed: true,
      installedAt: '2026-10-30T00:00:00.000Z',
      updatedAt: '2026-10-30T00:00:00.000Z',
    },
  ],
});

const render = (canManage: boolean, overrides: Partial<MarketplaceViewData> = {}): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <MarketplaceView
        view={{ ...viewData(), ...overrides }}
        loading={false}
        error={null}
        canManage={canManage}
        onInstall={vi.fn()}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
        onRetry={vi.fn()}
        {...(canManage ? { onInstallToken: vi.fn() } : {})}
      />
    </MessagesProvider>,
  );

describe('MarketplaceView', () => {
  it('lists the packs this site installed and the ones it can add', () => {
    const html = render(true);

    expect(html).toContain('ติดตั้งแล้ว');
    expect(html).toContain('พร้อมติดตั้ง');
    expect(html).toContain('ชุดเปิดตัวเว็บ');
    expect(html).toContain('ชุดจากผู้พัฒนาภายนอก');
    expect(html).toContain('เวอร์ชัน 1.0.0');
    expect(html).toContain('จากภายนอก (ลงลายเซ็นแล้ว)');
  });

  it('offers install, enable and remove only to a role that may manage packs', () => {
    const managed = render(true);
    const readOnly = render(false);

    expect(managed).toContain('ติดตั้งแพ็กจากผู้พัฒนาภายนอก');
    expect(managed).toContain('ถอนแพ็ก');
    expect(readOnly).not.toContain('ติดตั้งแพ็กจากผู้พัฒนาภายนอก');
    expect(readOnly).not.toContain('ถอนแพ็ก');
    expect(readOnly).toContain('ยังไม่ได้ติดตั้ง');
  });

  it('shows the price of a licence and how many sections a pack adds', () => {
    const html = render(true);

    expect(html).toContain('จำนวนส่วน');
    expect(html).toContain('สัญญาอนุญาต');
    expect(html).toContain('CC BY 4.0');
  });

  it('explains an empty marketplace instead of showing a blank grid', () => {
    const html = render(true, { catalog: [], installed: [] });

    expect(html).toContain('ยังไม่มีแพ็กในตลาดบล็อก');
  });

  it('shows a retry state when the catalogue could not be loaded', () => {
    const html = renderToStaticMarkup(
      <MessagesProvider locale="th">
        <MarketplaceView
          view={{ catalog: [], installed: [] }}
          loading={false}
          error="โหลดไม่สำเร็จ"
          canManage
          onInstall={vi.fn()}
          onToggle={vi.fn()}
          onRemove={vi.fn()}
          onRetry={vi.fn()}
          onInstallToken={vi.fn()}
        />
      </MessagesProvider>,
    );

    expect(html).toContain('โหลดไม่สำเร็จ');
    expect(html).toContain('ลองอีกครั้ง');
  });
});

describe('createDemoMarketplaceApi', () => {
  it('installs, turns off and removes a pack in memory', async () => {
    const api = createDemoMarketplaceApi();

    expect((await api.view()).installed).toEqual([]);

    const installed = await api.install({ key: 'lumio-launch' });
    expect(installed).toMatchObject({ key: 'lumio-launch', enabled: true });

    const view = await api.view();
    expect(view.installed).toHaveLength(1);
    expect(view.catalog.find((entry) => entry.key === 'lumio-launch')?.installed).toBe(true);

    const disabled = await api.setEnabled('lumio-launch', false);
    expect(disabled.enabled).toBe(false);

    await api.remove('lumio-launch');
    expect((await api.view()).installed).toEqual([]);
  });

  it('refuses to install a pack twice or a pack it does not know', async () => {
    const api = createDemoMarketplaceApi();
    await api.install({ key: 'lumio-launch' });

    await expect(api.install({ key: 'lumio-launch' })).rejects.toMatchObject({ code: 'conflict' });
    await expect(api.install({ key: 'missing-pack' })).rejects.toMatchObject({ code: 'not_found' });
  });
});

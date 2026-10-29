import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider, ToastProvider } from '@lumio/ui';
import { createDemoAiApi } from '../ai/demo.js';
import { CommercePage } from '../commerce/CommercePage.js';
import { createDemoCommerceApi } from '../commerce/demo.js';
import { GrowthPage } from '../growth/GrowthPage.js';
import {
  createDemoAnalyticsApi,
  createDemoAppsApi,
  createDemoNewsletterApi,
  createDemoSeoApi,
} from '../growth/demo.js';
import { SettingsPage } from '../settings/SettingsPage.js';
import type { BillingApi } from '../settings/billing.js';
import { createDemoSettingsApi } from '../settings/demo.js';
import type { Role } from '@lumio/shared';

/**
 * A tab that a role cannot open must not be offered at all: clicking it would
 * only bounce the reader back to the overview (docs/design/05-admin-ia.md 5.1).
 */

const billing = {} as unknown as BillingApi;

const render = (node: JSX.Element): string =>
  renderToStaticMarkup(
    <MessagesProvider locale="th">
      <ToastProvider>{node}</ToastProvider>
    </MessagesProvider>,
  );

const settings = (role: Role) =>
  render(
    <SettingsPage
      api={createDemoSettingsApi()}
      billing={billing}
      tab="general"
      role={role}
      onNavigate={vi.fn()}
    />,
  );

const shop = (role: Role) =>
  render(
    <CommercePage
      api={createDemoCommerceApi()}
      tab="products"
      canManage={role !== 'viewer'}
      role={role}
      onNavigate={vi.fn()}
    />,
  );

const growth = (role: Role, features?: readonly ('ai' | 'analytics' | 'newsletter' | 'apps')[]) =>
  render(
    <GrowthPage
      tab="seo"
      apis={{
        seo: createDemoSeoApi(createDemoAiApi()),
        analytics: createDemoAnalyticsApi(),
        newsletter: createDemoNewsletterApi(),
        apps: createDemoAppsApi(),
      }}
      canManage={role !== 'viewer'}
      role={role}
      {...(features ? { features } : {})}
      onNavigate={vi.fn()}
    />,
  );

describe('settings tabs', () => {
  it('shows the plan tab to the owner only', () => {
    expect(settings('owner')).toContain('แพ็กเกจ &amp; การชำระเงิน');
    expect(settings('admin')).not.toContain('แพ็กเกจ &amp; การชำระเงิน');
  });

  it('offers every tab it shows, so none of them is a dead end', () => {
    const html = settings('admin');

    expect(html).toContain('role="tablist"');
    expect(html).toContain('ทั่วไป');
    expect(html).toContain('โดเมน');
    expect(html).toContain('ทีมงาน &amp; สิทธิ์');
  });
});

describe('shop tabs', () => {
  it('keeps payment settings away from an editor', () => {
    expect(shop('owner')).toContain('ตั้งค่าร้านค้า');
    expect(shop('editor')).not.toContain('ตั้งค่าร้านค้า');
    expect(shop('editor')).toContain('คำสั่งซื้อ');
  });
});

describe('growth tabs', () => {
  it('keeps the App store away from an editor', () => {
    expect(growth('owner')).toContain('Apps');
    expect(growth('editor')).not.toContain('Apps');
    expect(growth('editor')).toContain('SEO');
  });

  it('drops the tabs of add-ons the site closed', () => {
    const html = growth('owner', ['ai']);

    expect(html).not.toContain('สถิติผู้เข้าชม');
    expect(html).not.toContain('ข่าวสาร');
    expect(html).not.toContain('Apps');
  });

  it('renders no tab strip when a single screen is left', () => {
    expect(growth('owner', ['ai'])).not.toContain('role="tablist"');
  });
});

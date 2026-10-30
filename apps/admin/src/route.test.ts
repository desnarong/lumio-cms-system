import { describe, expect, it, vi } from 'vitest';
import { createDemoAiApi } from './ai/demo.js';
import { createMemoryStorage, createSessionStore } from './auth/session.js';
import { createDemoAuthApi } from './auth/demo.js';
import { createDemoCommerceApi } from './commerce/demo.js';
import { createDemoMembershipApi } from './membership/demo.js';
import type { AdminClients } from './clients.js';
import { createDemoDashboardApi } from './dashboard/demo.js';
import { createDemoDesignApi } from './design/demo.js';
import { createDemoContentApi } from './editor/demo.js';
import { createDemoSectionTemplateApi } from './editor/sections.js';
import { createDemoFormsApi } from './forms/demo.js';
import {
  createDemoAnalyticsApi,
  createDemoAppsApi,
  createDemoNewsletterApi,
  createDemoSeoApi,
} from './growth/demo.js';
import { createDemoMediaApi } from './media/demo.js';
import { createDemoMarketplaceApi } from './marketplace/api.js';
import { createDemoBookingApi } from './booking/api.js';
import { createDemoApiKeysApi } from './settings/api-keys.js';
import { createDemoAgencyApi } from './settings/branding.js';
import { createDemoSettingsApi } from './settings/demo.js';
import { createDemoBillingApi } from './settings/billing.js';
import { createDemoWizardApi } from './wizard/demo.js';
import { createDemoUpdatesApi } from './updates/demo.js';
import { isRouteAllowed, parseRoute, resolveRoute, routePath } from './route.js';

interface Options {
  demo?: boolean;
  listSites?: unknown[];
  listPages?: unknown[];
}

const clients = ({ demo = true, listSites, listPages }: Options = {}): AdminClients => {
  const ai = createDemoAiApi();

  return {
    demo,
    session: createSessionStore(createMemoryStorage()),
    auth: createDemoAuthApi(),
    ai,
    wizard: { ...createDemoWizardApi(), listSites: vi.fn().mockResolvedValue(listSites ?? []) },
    content: { ...createDemoContentApi(), listPages: vi.fn().mockResolvedValue(listPages ?? []) },
    sections: createDemoSectionTemplateApi(),
    forms: createDemoFormsApi(),
    media: createDemoMediaApi(),
    dashboard: createDemoDashboardApi(),
    commerce: createDemoCommerceApi(),
    membership: createDemoMembershipApi(),
    design: createDemoDesignApi(),
    settings: createDemoSettingsApi(),
    billing: createDemoBillingApi(),
    seo: createDemoSeoApi(ai),
    analytics: createDemoAnalyticsApi(),
    newsletter: createDemoNewsletterApi(),
    apps: createDemoAppsApi(),
    marketplace: createDemoMarketplaceApi(),
    booking: createDemoBookingApi(),
    apiKeys: createDemoApiKeysApi(),
    agency: createDemoAgencyApi(),
    updates: createDemoUpdatesApi(),
  };
};

const signedIn = (all: AdminClients, siteId: string | null): void => {
  all.session.write({
    accessToken: 'token',
    user: { id: 'u1', email: 'owner@example.com', name: 'สมชาย', avatarUrl: null },
    siteId,
  });
};

const siteRow = (id: string) => ({
  id,
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th'],
  plan: 'pro',
  role: 'owner' as const,
  createdAt: '2026-10-20T00:00:00.000Z',
});

describe('resolveRoute', () => {
  it('asks for sign-in when there is no session', async () => {
    expect(await resolveRoute(clients())).toEqual({ name: 'login' });
  });

  it('starts the wizard when the user has no site yet', async () => {
    const all = clients({ demo: false });
    signedIn(all, null);

    expect(await resolveRoute(all)).toEqual({ name: 'wizard' });
  });

  it('lands a returning user on the dashboard of their site', async () => {
    const all = clients();
    signedIn(all, 'demo-site-1');

    expect(await resolveRoute(all)).toEqual({ name: 'dashboard' });
  });

  it('remembers the first site of a returning user', async () => {
    const all = clients({ demo: false, listSites: [siteRow('site-9')] });
    signedIn(all, null);

    expect(await resolveRoute(all)).toEqual({ name: 'dashboard' });
    expect(all.session.read()?.siteId).toBe('site-9');
  });

  it('survives an API that is not answering', async () => {
    const all = clients({ demo: false });
    const failing = {
      ...all,
      wizard: {
        ...all.wizard,
        listSites: vi.fn().mockRejectedValue(new Error('offline')),
      },
    };
    signedIn(failing, null);

    expect(await resolveRoute(failing)).toEqual({ name: 'wizard' });
  });
});

describe('route paths', () => {
  it('round-trips every screen through its URL', () => {
    const routes = [
      { name: 'dashboard' as const },
      { name: 'content' as const, kind: 'page' as const },
      { name: 'content' as const, kind: 'post' as const },
      { name: 'forms' as const },
      { name: 'media' as const },
      { name: 'design' as const, tab: 'style' as const },
      { name: 'design' as const, tab: 'sections' as const },
      { name: 'growth' as const, tab: 'seo' as const },
      { name: 'growth' as const, tab: 'analytics' as const },
      { name: 'growth' as const, tab: 'newsletter' as const },
      { name: 'growth' as const, tab: 'apps' as const },
      { name: 'settings' as const, tab: 'domain' as const },
      { name: 'editor' as const, contentId: 'c1' },
    ];

    for (const route of routes) {
      expect(parseRoute(routePath(route))).toEqual(route);
    }
  });

  it('treats the root as the dashboard and ignores unknown paths', () => {
    expect(parseRoute('/')).toEqual({ name: 'dashboard' });
    expect(parseRoute('/dashboard/')).toEqual({ name: 'dashboard' });
    expect(parseRoute('/nope')).toBeNull();
    expect(parseRoute('/content/whatever')).toBeNull();
  });

  it('falls back to the first tab of a menu when the tab is unknown', () => {
    expect(parseRoute('/design')).toEqual({ name: 'design', tab: 'style' });
    expect(parseRoute('/growth')).toEqual({ name: 'growth', tab: 'seo' });
    expect(parseRoute('/settings')).toEqual({ name: 'settings', tab: 'general' });
  });
});

describe('isRouteAllowed', () => {
  it('hides design from authors and viewers, and settings from editors', () => {
    expect(isRouteAllowed({ name: 'design', tab: 'style' }, 'editor')).toBe(true);
    expect(isRouteAllowed({ name: 'design', tab: 'style' }, 'author')).toBe(false);
    expect(isRouteAllowed({ name: 'settings', tab: 'team' }, 'editor')).toBe(false);
    expect(isRouteAllowed({ name: 'settings', tab: 'team' }, 'admin')).toBe(true);
    expect(isRouteAllowed({ name: 'dashboard' }, 'viewer')).toBe(true);
  });

  it('lets editors grow the site but keeps App installs with owners and admins', () => {
    expect(isRouteAllowed({ name: 'growth', tab: 'seo' }, 'editor')).toBe(true);
    expect(isRouteAllowed({ name: 'growth', tab: 'newsletter' }, 'editor')).toBe(true);
    expect(isRouteAllowed({ name: 'growth', tab: 'apps' }, 'editor')).toBe(false);
    expect(isRouteAllowed({ name: 'growth', tab: 'apps' }, 'admin')).toBe(true);
    expect(isRouteAllowed({ name: 'growth', tab: 'seo' }, 'viewer')).toBe(false);
  });
});

describe('commerce routes', () => {
  it('parses product and order screens', () => {
    expect(parseRoute('/commerce/products')).toEqual({ name: 'commerce', tab: 'products' });
    expect(parseRoute('/commerce/orders')).toEqual({ name: 'commerce', tab: 'orders' });
    expect(parseRoute('/commerce/settings')).toEqual({ name: 'commerce', tab: 'settings' });
    expect(parseRoute('/commerce')).toEqual({ name: 'commerce', tab: 'products' });
  });

  it('lets an editor run the shop but keeps payment settings for admins', () => {
    expect(isRouteAllowed({ name: 'commerce', tab: 'orders' }, 'editor')).toBe(true);
    expect(isRouteAllowed({ name: 'commerce', tab: 'settings' }, 'editor')).toBe(false);
    expect(isRouteAllowed({ name: 'commerce', tab: 'settings' }, 'admin')).toBe(true);
  });
});

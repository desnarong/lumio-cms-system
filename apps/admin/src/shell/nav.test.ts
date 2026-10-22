import { describe, expect, it } from 'vitest';
import { activeMenuId, featureForRoute, NAV_MENUS, visibleMenus } from './nav.js';

const ids = (role: Parameters<typeof visibleMenus>[0]): string[] =>
  visibleMenus(role).map((menu) => menu.id);

describe('visibleMenus', () => {
  it('shows every menu to an owner', () => {
    expect(ids('owner')).toEqual(['dashboard', 'content', 'design', 'growth', 'settings']);
  });

  it('hides design, growth and settings from a viewer', () => {
    expect(ids('viewer')).toEqual(['dashboard', 'content']);
  });

  it('hides settings from an editor but keeps design and growth', () => {
    expect(ids('editor')).toEqual(['dashboard', 'content', 'design', 'growth']);
  });

  it('never adds a sixth main menu', () => {
    expect(NAV_MENUS.length).toBeLessThanOrEqual(5);
  });

  it('gives every entry a screen of its own', () => {
    for (const menu of NAV_MENUS) {
      expect(menu.entries.length).toBeGreaterThan(0);
    }
  });

  it('offers the forms inbox inside the content menu', () => {
    const content = NAV_MENUS.find((menu) => menu.id === 'content');
    expect(content?.entries.map((entry) => entry.id)).toContain('forms');
  });

  it('keeps App installs out of an editor\u2019s growth menu', () => {
    const growthForEditor = visibleMenus('editor').find((menu) => menu.id === 'growth');
    expect(growthForEditor?.entries.map((entry) => entry.id)).toEqual([
      'seo',
      'analytics',
      'newsletter',
    ]);

    const growthForOwner = visibleMenus('owner').find((menu) => menu.id === 'growth');
    expect(growthForOwner?.entries.map((entry) => entry.id)).toContain('apps');
  });
});

describe('feature gating', () => {
  it('drops the screens of a closed add-on', () => {
    const menus = visibleMenus('owner', ['ai', 'analytics', 'newsletter', 'apps']);
    const content = menus.find((menu) => menu.id === 'content');
    const growth = menus.find((menu) => menu.id === 'growth');

    expect(content?.entries.map((entry) => entry.id)).not.toContain('products');
    expect(content?.entries.map((entry) => entry.id)).not.toContain('orders');
    expect(growth?.entries.map((entry) => entry.id)).toEqual(['seo', 'analytics', 'newsletter', 'apps']);
  });

  it('removes a whole menu when nothing is left in it', () => {
    const menus = visibleMenus('owner', ['ai']);

    expect(menus.map((menu) => menu.id)).toEqual(['dashboard', 'content', 'design', 'growth', 'settings']);
    expect(menus.find((menu) => menu.id === 'growth')?.entries.map((entry) => entry.id)).toEqual([
      'seo',
    ]);
    expect(menus.find((menu) => menu.id === 'settings')?.entries.map((entry) => entry.id)).not.toContain(
      'shop-settings',
    );
  });

  it('sends a deep link of a closed add-on to the dashboard', () => {
    expect(featureForRoute({ name: 'commerce', tab: 'orders' })).toBe('commerce');
    expect(featureForRoute({ name: 'growth', tab: 'analytics' })).toBe('analytics');
    expect(featureForRoute({ name: 'growth', tab: 'apps' })).toBe('apps');
    expect(featureForRoute({ name: 'growth', tab: 'seo' })).toBeUndefined();
    expect(featureForRoute({ name: 'settings', tab: 'features' })).toBeUndefined();
  });
});

describe('activeMenuId', () => {
  it('highlights content for the editor and the media library', () => {
    expect(activeMenuId({ name: 'editor', contentId: 'c1' })).toBe('content');
    expect(activeMenuId({ name: 'media' })).toBe('content');
    expect(activeMenuId({ name: 'content', kind: 'post' })).toBe('content');
    expect(activeMenuId({ name: 'forms' })).toBe('content');
  });

  it('highlights design, growth and settings on their own screens', () => {
    expect(activeMenuId({ name: 'design', tab: 'menus' })).toBe('design');
    expect(activeMenuId({ name: 'growth', tab: 'seo' })).toBe('growth');
    expect(activeMenuId({ name: 'settings', tab: 'team' })).toBe('settings');
    expect(activeMenuId({ name: 'dashboard' })).toBe('dashboard');
  });
});

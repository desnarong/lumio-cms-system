import { describe, expect, it } from 'vitest';
import { routePath } from '../route.js';
import {
  activeDestinationId,
  destinationForRoute,
  featureForRoute,
  NAV_DESTINATIONS,
  NAV_SCREENS,
  NAV_SECTIONS,
  screenForPath,
  visibleScreens,
  visibleSidebar,
} from './nav.js';

const doorIds = (
  role: Parameters<typeof visibleSidebar>[0],
  features?: Parameters<typeof visibleSidebar>[1],
): string[] =>
  visibleSidebar(role, features).flatMap((group) => group.items.map((item) => item.id));

const screenPaths = (
  role: Parameters<typeof visibleScreens>[0],
  features?: Parameters<typeof visibleScreens>[1],
): string[] => visibleScreens(role, features).map((screen) => routePath(screen.route));

describe('visibleSidebar', () => {
  it('offers an owner nine doors, and never a tenth', () => {
    expect(doorIds('owner')).toEqual([
      'dashboard',
      'pages',
      'posts',
      'media',
      'forms',
      'shop',
      'design',
      'growth',
      'settings',
    ]);
    expect(NAV_DESTINATIONS.length).toBeLessThanOrEqual(9);
  });

  it('keeps three groups at most, so nothing has to be expanded first', () => {
    expect(NAV_SECTIONS.length).toBe(3);
    expect(visibleSidebar('owner').map((group) => group.section.id)).toEqual([
      'work',
      'shop',
      'site',
    ]);
  });

  it('hides the shop, design, growth and settings doors from a viewer', () => {
    expect(doorIds('viewer')).toEqual(['dashboard', 'pages', 'posts', 'media', 'forms']);
    expect(visibleSidebar('viewer').map((group) => group.section.id)).toEqual(['work']);
  });

  it('hides settings from an editor but keeps design and growth', () => {
    expect(doorIds('editor')).toEqual([
      'dashboard',
      'pages',
      'posts',
      'media',
      'forms',
      'shop',
      'design',
      'growth',
    ]);
  });

  it('drops the shop door when the site closed the commerce add-on', () => {
    const open = ['ai', 'analytics', 'newsletter', 'apps'] as const;

    expect(doorIds('owner', [...open])).not.toContain('shop');
    expect(visibleSidebar('owner', [...open]).map((group) => group.section.id)).toEqual([
      'work',
      'site',
    ]);
  });

  it('removes a group with nothing left in it', () => {
    expect(visibleSidebar('owner', ['ai']).map((group) => group.section.id)).toEqual([
      'work',
      'site',
    ]);
  });

  it('opens every door on a screen that exists', () => {
    const paths = new Set(NAV_SCREENS.map((screen) => routePath(screen.route)));

    for (const door of NAV_DESTINATIONS) {
      expect(paths.has(door.path)).toBe(true);
    }
  });
});

describe('visibleScreens', () => {
  it('names one screen per address, so the palette never repeats itself', () => {
    const paths = screenPaths('owner');

    expect(new Set(paths).size).toBe(paths.length);
  });

  it('reaches the tabs behind a door, which the sidebar no longer lists', () => {
    const paths = screenPaths('owner');

    for (const path of [
      '/design/menus',
      '/settings/language',
      '/growth/apps',
      '/commerce/orders',
    ]) {
      expect(paths).toContain(path);
    }
  });

  it('drops the screens of a closed add-on', () => {
    const paths = screenPaths('owner', ['ai', 'analytics', 'newsletter', 'apps']);

    expect(paths).not.toContain('/commerce/products');
    expect(paths).toContain('/growth/analytics');
  });

  it('keeps App installs out of the growth screens of an editor', () => {
    expect(screenPaths('editor')).toContain('/growth/seo');
    expect(screenPaths('editor')).not.toContain('/growth/apps');
    expect(screenPaths('owner')).toContain('/growth/apps');
  });

  it('keeps billing for the owner alone', () => {
    expect(screenPaths('admin')).not.toContain('/settings/billing');
    expect(screenPaths('owner')).toContain('/settings/billing');
  });
});

describe('activeDestinationId', () => {
  it('highlights one door per screen', () => {
    expect(activeDestinationId({ name: 'dashboard' })).toBe('dashboard');
    expect(activeDestinationId({ name: 'content', kind: 'page' })).toBe('pages');
    expect(activeDestinationId({ name: 'content', kind: 'post' })).toBe('posts');
    expect(activeDestinationId({ name: 'editor', contentId: 'c1' })).toBe('pages');
    expect(activeDestinationId({ name: 'media' })).toBe('media');
    expect(activeDestinationId({ name: 'forms' })).toBe('forms');
  });

  it('highlights the door a tab belongs to', () => {
    expect(activeDestinationId({ name: 'commerce', tab: 'orders' })).toBe('shop');
    expect(activeDestinationId({ name: 'design', tab: 'menus' })).toBe('design');
    expect(activeDestinationId({ name: 'growth', tab: 'apps' })).toBe('growth');
    expect(activeDestinationId({ name: 'settings', tab: 'team' })).toBe('settings');
  });
});

describe('breadcrumb lookups', () => {
  it('names the screen behind an address', () => {
    expect(screenForPath('/settings/team')?.labelKey).toBe('nav.team');
    expect(screenForPath('/design/style')?.labelKey).toBe('nav.style');
    expect(screenForPath('/nope')).toBeUndefined();
  });

  it('names the door behind a screen', () => {
    expect(destinationForRoute({ name: 'settings', tab: 'team' })?.id).toBe('settings');
    expect(destinationForRoute({ name: 'commerce', tab: 'orders' })?.id).toBe('shop');
  });
});

describe('feature gating', () => {
  it('sends a deep link of a closed add-on to the dashboard', () => {
    expect(featureForRoute({ name: 'commerce', tab: 'orders' })).toBe('commerce');
    expect(featureForRoute({ name: 'growth', tab: 'analytics' })).toBe('analytics');
    expect(featureForRoute({ name: 'growth', tab: 'apps' })).toBe('apps');
    expect(featureForRoute({ name: 'growth', tab: 'seo' })).toBeUndefined();
    expect(featureForRoute({ name: 'settings', tab: 'features' })).toBeUndefined();
  });
});

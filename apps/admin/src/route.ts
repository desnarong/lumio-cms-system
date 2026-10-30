import { HOME_SLUG, isContentType, type ContentType, type Role } from '@lumio/shared';
import type { AdminClients } from './clients.js';
import { DEMO_CONTENT_ID } from './editor/demo.js';

export type DesignTab = 'style' | 'menus' | 'header-footer' | 'template' | 'sections';
export type SettingsTab =
  | 'general'
  | 'language'
  | 'domain'
  | 'redirects'
  | 'team'
  | 'backup'
  | 'email'
  | 'publish'
  | 'features'
  | 'billing';
export type GrowthTab = 'seo' | 'analytics' | 'newsletter' | 'membership' | 'apps';
export type CommerceTab = 'products' | 'promotions' | 'orders' | 'settings';

export const DESIGN_TABS: DesignTab[] = ['style', 'menus', 'header-footer', 'template', 'sections'];
export const SETTINGS_TABS: SettingsTab[] = [
  'general',
  'language',
  'domain',
  'redirects',
  'team',
  'backup',
  'email',
  'publish',
  'features',
  'billing',
];
export const GROWTH_TABS: GrowthTab[] = [
  'seo',
  'analytics',
  'newsletter',
  'membership',
  'apps',
];
export const COMMERCE_TABS: CommerceTab[] = ['products', 'promotions', 'orders', 'settings'];

/**
 * One entry per screen. Routes are site-relative: the current site lives in the
 * session, so a URL stays valid when the user switches sites.
 */
export type AdminRoute =
  | { name: 'login' }
  | { name: 'wizard' }
  | { name: 'dashboard' }
  | { name: 'editor'; contentId: string }
  | { name: 'content'; kind: ContentType }
  | { name: 'forms' }
  | { name: 'media' }
  | { name: 'design'; tab: DesignTab }
  | { name: 'growth'; tab: GrowthTab }
  | { name: 'commerce'; tab: CommerceTab }
  | { name: 'settings'; tab: SettingsTab };

/** Roles allowed on each screen (13-rbac.md); others never see the menu entry. */
const DESIGN_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SETTINGS_ROLES: Role[] = ['owner', 'admin'];
const GROWTH_ROLES: Role[] = ['owner', 'admin', 'editor'];
/** Products and orders are day-to-day work; payment settings stay with admins. */
const SHOP_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SHOP_SETTINGS_ROLES: Role[] = ['owner', 'admin'];
/** Installing an App changes data access, so only owners/admins may open the store. */
const APP_ROLES: Role[] = ['owner', 'admin'];
/** Only the owner manages the plan and payment (docs/design/13-rbac.md). */
const BILLING_ROLES: Role[] = ['owner'];

export const isRouteAllowed = (route: AdminRoute, role: Role): boolean => {
  if (route.name === 'design') return DESIGN_ROLES.includes(role);
  if (route.name === 'growth') {
    return route.tab === 'apps' ? APP_ROLES.includes(role) : GROWTH_ROLES.includes(role);
  }
  if (route.name === 'commerce') {
    return route.tab === 'settings' ? SHOP_SETTINGS_ROLES.includes(role) : SHOP_ROLES.includes(role);
  }
  if (route.name === 'settings') {
    return route.tab === 'billing' ? BILLING_ROLES.includes(role) : SETTINGS_ROLES.includes(role);
  }
  return true;
};

/** URL for a screen; the single source of truth for every link in the shell. */
export const routePath = (route: AdminRoute): string => {
  switch (route.name) {
    case 'login':
      return '/login';
    case 'wizard':
      return '/wizard';
    case 'dashboard':
      return '/dashboard';
    case 'editor':
      return `/editor/${route.contentId}`;
    case 'content':
      return `/content/${route.kind}`;
    case 'forms':
      return '/content/forms';
    case 'media':
      return '/content/media';
    case 'design':
      return `/design/${route.tab}`;
    case 'growth':
      return `/growth/${route.tab}`;
    case 'commerce':
      return `/commerce/${route.tab}`;
    case 'settings':
      return `/settings/${route.tab}`;
  }
};

/** Reads a screen out of a path; `null` when the path is not one of ours. */
export const parseRoute = (path: string): AdminRoute | null => {
  const clean = (path.split('?')[0] ?? '').replace(/\/+$/, '');
  if (clean === '' || clean === '/') return { name: 'dashboard' };

  const [first, second] = clean.replace(/^\//, '').split('/');

  switch (first) {
    case 'login':
      return { name: 'login' };
    case 'wizard':
      return { name: 'wizard' };
    case 'dashboard':
      return { name: 'dashboard' };
    case 'editor':
      return second ? { name: 'editor', contentId: second } : null;
    case 'content':
      if (second === 'forms') return { name: 'forms' };
      if (second === 'media') return { name: 'media' };
      if (isContentType(second)) return { name: 'content', kind: second };
      return null;
    case 'design':
      return second && (DESIGN_TABS as string[]).includes(second)
        ? { name: 'design', tab: second as DesignTab }
        : { name: 'design', tab: 'style' };
    case 'growth':
      return second && (GROWTH_TABS as string[]).includes(second)
        ? { name: 'growth', tab: second as GrowthTab }
        : { name: 'growth', tab: 'seo' };
    case 'commerce':
      return second && (COMMERCE_TABS as string[]).includes(second)
        ? { name: 'commerce', tab: second as CommerceTab }
        : { name: 'commerce', tab: 'products' };
    case 'settings':
      return second && (SETTINGS_TABS as string[]).includes(second)
        ? { name: 'settings', tab: second as SettingsTab }
        : { name: 'settings', tab: 'general' };
    default:
      return null;
  }
};

/** Site the signed-in user lands on: the stored one, otherwise their first. */
const siteIdForSession = async (clients: AdminClients): Promise<string | null> => {
  const stored = clients.session.read()?.siteId ?? null;
  if (stored) return stored;
  if (clients.demo) return 'demo-site-1';

  const sites = await clients.wizard.listSites().catch(() => []);
  return sites[0]?.id ?? null;
};

/** The page the editor opens: the site's home page, otherwise the first one. */
export const homeContentId = async (clients: AdminClients): Promise<string | null> => {
  if (clients.demo) return DEMO_CONTENT_ID;

  const pages = await clients.content.listPages().catch(() => []);
  return (pages.find((page) => page.slug === HOME_SLUG) ?? pages[0])?.id ?? null;
};

export const editorRoute = async (clients: AdminClients): Promise<AdminRoute> => {
  const contentId = await homeContentId(clients);
  return contentId ? { name: 'editor', contentId } : { name: 'wizard' };
};

/**
 * Where the app starts: sign-in, the onboarding wizard (no site yet), or the
 * dashboard of the user's site (docs/design/05-admin-ia.md 5.2).
 */
export const resolveRoute = async (clients: AdminClients): Promise<AdminRoute> => {
  if (!clients.session.read()) return { name: 'login' };

  const siteId = await siteIdForSession(clients);
  if (!siteId) return { name: 'wizard' };

  clients.session.setSiteId(siteId);
  return { name: 'dashboard' };
};

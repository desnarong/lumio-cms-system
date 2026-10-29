import { FEATURE_FLAG_KEYS, type FeatureFlagKey, type Role } from '@lumio/shared';
import type { IconName, MessageKey } from '@lumio/ui';
import { isRouteAllowed, routePath, type AdminRoute } from '../route.js';

/**
 * One flat menu (docs/design/05-admin-ia.md 5.1).
 *
 * The sidebar lists nine destinations and nothing else: everything below a
 * destination is a tab of that screen, so the same choice is never offered
 * twice. `NAV_SCREENS` still knows every address, which is what the command
 * palette and the breadcrumb read from, so a deep link always has a name.
 *
 * Labels are message keys, not text: the shell renders them through the
 * translator of the current language (AGENTS.md rule 4).
 */

export type NavSectionId = 'work' | 'shop' | 'site';

export interface NavSection {
  id: NavSectionId;
  labelKey: MessageKey;
}

/** The three sidebar groups; a group disappears when it has nothing left. */
export const NAV_SECTIONS: NavSection[] = [
  { id: 'work', labelKey: 'nav.section.work' },
  { id: 'shop', labelKey: 'nav.section.shop' },
  { id: 'site', labelKey: 'nav.section.site' },
];

/** A screen the back office can open: one address, one name, one icon. */
export interface NavScreen {
  id: string;
  labelKey: MessageKey;
  icon: IconName;
  route: AdminRoute;
  section: NavSectionId;
  /** Roles that may open it; omitted means everyone. */
  roles?: Role[];
  /** Add-on it belongs to; hidden while the site closed it. */
  feature?: FeatureFlagKey;
}

const DESIGN_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SETTINGS_ROLES: Role[] = ['owner', 'admin'];
const GROWTH_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SHOP_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SHOP_SETTINGS_ROLES: Role[] = ['owner', 'admin'];
const APP_ROLES: Role[] = ['owner', 'admin'];
/** Only the owner manages the plan and payment (docs/design/13-rbac.md). */
const BILLING_ROLES: Role[] = ['owner'];

export const NAV_SCREENS: NavScreen[] = [
  // ── Everyday work ──────────────────────────────────────────────────────
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: 'home',
    section: 'work',
    route: { name: 'dashboard' },
  },
  {
    id: 'pages',
    labelKey: 'nav.pages',
    icon: 'file-text',
    section: 'work',
    route: { name: 'content', kind: 'page' },
  },
  {
    id: 'posts',
    labelKey: 'nav.posts',
    icon: 'pen',
    section: 'work',
    route: { name: 'content', kind: 'post' },
  },
  { id: 'media', labelKey: 'nav.media', icon: 'image', section: 'work', route: { name: 'media' } },
  { id: 'forms', labelKey: 'nav.forms', icon: 'inbox', section: 'work', route: { name: 'forms' } },

  // ── Shop (add-on) ──────────────────────────────────────────────────────
  {
    id: 'products',
    labelKey: 'nav.products',
    icon: 'package',
    section: 'shop',
    roles: SHOP_ROLES,
    feature: 'commerce',
    route: { name: 'commerce', tab: 'products' },
  },
  {
    id: 'orders',
    labelKey: 'nav.orders',
    icon: 'receipt',
    section: 'shop',
    roles: SHOP_ROLES,
    feature: 'commerce',
    route: { name: 'commerce', tab: 'orders' },
  },
  {
    id: 'shop-settings',
    labelKey: 'nav.shopSettings',
    icon: 'shopping-bag',
    section: 'shop',
    roles: SHOP_SETTINGS_ROLES,
    feature: 'commerce',
    route: { name: 'commerce', tab: 'settings' },
  },

  // ── Design ─────────────────────────────────────────────────────────────
  {
    id: 'style',
    labelKey: 'nav.style',
    icon: 'palette',
    section: 'site',
    roles: DESIGN_ROLES,
    route: { name: 'design', tab: 'style' },
  },
  {
    id: 'menus',
    labelKey: 'nav.menus',
    icon: 'compass',
    section: 'site',
    roles: DESIGN_ROLES,
    route: { name: 'design', tab: 'menus' },
  },
  {
    id: 'header-footer',
    labelKey: 'nav.headerFooter',
    icon: 'layout',
    section: 'site',
    roles: DESIGN_ROLES,
    route: { name: 'design', tab: 'header-footer' },
  },
  {
    id: 'template',
    labelKey: 'nav.template',
    icon: 'layers',
    section: 'site',
    roles: DESIGN_ROLES,
    route: { name: 'design', tab: 'template' },
  },
  {
    id: 'sections',
    labelKey: 'nav.sections',
    icon: 'grid',
    section: 'site',
    roles: DESIGN_ROLES,
    route: { name: 'design', tab: 'sections' },
  },

  // ── Growth ─────────────────────────────────────────────────────────────
  {
    id: 'seo',
    labelKey: 'nav.seo',
    icon: 'search',
    section: 'site',
    roles: GROWTH_ROLES,
    route: { name: 'growth', tab: 'seo' },
  },
  {
    id: 'analytics',
    labelKey: 'nav.analytics',
    icon: 'chart-bar',
    section: 'site',
    roles: GROWTH_ROLES,
    feature: 'analytics',
    route: { name: 'growth', tab: 'analytics' },
  },
  {
    id: 'newsletter',
    labelKey: 'nav.newsletter',
    icon: 'send',
    section: 'site',
    roles: GROWTH_ROLES,
    feature: 'newsletter',
    route: { name: 'growth', tab: 'newsletter' },
  },
  {
    id: 'apps',
    labelKey: 'nav.apps',
    icon: 'app-window',
    section: 'site',
    roles: APP_ROLES,
    feature: 'apps',
    route: { name: 'growth', tab: 'apps' },
  },

  // ── Settings ───────────────────────────────────────────────────────────
  {
    id: 'general',
    labelKey: 'nav.general',
    icon: 'settings',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'general' },
  },
  {
    id: 'language',
    labelKey: 'settings.tabLanguage',
    icon: 'globe',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'language' },
  },
  {
    id: 'domain',
    labelKey: 'nav.domain',
    icon: 'link',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'domain' },
  },
  {
    id: 'redirects',
    labelKey: 'settings.tabRedirects',
    icon: 'arrow-right',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'redirects' },
  },
  {
    id: 'team',
    labelKey: 'nav.team',
    icon: 'users',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'team' },
  },
  {
    id: 'backup',
    labelKey: 'nav.backup',
    icon: 'database',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'backup' },
  },
  {
    id: 'email',
    labelKey: 'settings.tabEmail',
    icon: 'mail',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'email' },
  },
  {
    id: 'publish',
    labelKey: 'settings.tabPublish',
    icon: 'upload',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'publish' },
  },
  {
    id: 'features',
    labelKey: 'settings.tabFeatures',
    icon: 'zap',
    section: 'site',
    roles: SETTINGS_ROLES,
    route: { name: 'settings', tab: 'features' },
  },
  {
    id: 'billing',
    labelKey: 'nav.billing',
    icon: 'credit-card',
    section: 'site',
    roles: BILLING_ROLES,
    route: { name: 'settings', tab: 'billing' },
  },
];

/** A sidebar destination: the door to a screen and the tabs behind it. */
export interface NavDestination {
  id: string;
  labelKey: MessageKey;
  icon: IconName;
  section: NavSectionId;
  /** Address the destination opens; the screen there owns the tabs. */
  path: string;
  roles?: Role[];
  feature?: FeatureFlagKey;
}

/**
 * Nine doors, no nesting. `shop`, `design`, `growth` and `settings` open on
 * their first tab and continue with the tab strip of that screen.
 */
export const NAV_DESTINATIONS: NavDestination[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: 'home', section: 'work', path: '/dashboard' },
  {
    id: 'pages',
    labelKey: 'nav.pages',
    icon: 'file-text',
    section: 'work',
    path: '/content/page',
  },
  {
    id: 'posts',
    labelKey: 'nav.posts',
    icon: 'pen',
    section: 'work',
    path: '/content/post',
  },
  { id: 'media', labelKey: 'nav.media', icon: 'image', section: 'work', path: '/content/media' },
  { id: 'forms', labelKey: 'nav.forms', icon: 'inbox', section: 'work', path: '/content/forms' },
  {
    id: 'shop',
    labelKey: 'nav.shop',
    icon: 'shopping-bag',
    section: 'shop',
    path: '/commerce/products',
    roles: SHOP_ROLES,
    feature: 'commerce',
  },
  {
    id: 'design',
    labelKey: 'nav.design',
    icon: 'palette',
    section: 'site',
    path: '/design/style',
    roles: DESIGN_ROLES,
  },
  {
    id: 'growth',
    labelKey: 'nav.growth',
    icon: 'trending-up',
    section: 'site',
    path: '/growth/seo',
    roles: GROWTH_ROLES,
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    icon: 'settings',
    section: 'site',
    path: '/settings/general',
    roles: SETTINGS_ROLES,
  },
];

const allows = (roles: Role[] | undefined, role: Role): boolean =>
  roles === undefined || roles.includes(role);

const featureOpen = (
  feature: FeatureFlagKey | undefined,
  features: readonly FeatureFlagKey[],
): boolean => feature === undefined || features.includes(feature);

/** Every address the role may open, including the tabs behind a destination. */
export const visibleScreens = (
  role: Role,
  features: readonly FeatureFlagKey[] = FEATURE_FLAG_KEYS,
): NavScreen[] =>
  NAV_SCREENS.filter(
    (screen) => allows(screen.roles, role) && featureOpen(screen.feature, features),
  );

export interface NavGroup {
  section: NavSection;
  items: NavDestination[];
}

/** The sidebar of the role: destinations grouped under their three labels. */
export const visibleSidebar = (
  role: Role,
  features: readonly FeatureFlagKey[] = FEATURE_FLAG_KEYS,
): NavGroup[] =>
  NAV_SECTIONS.map((section) => ({
    section,
    items: NAV_DESTINATIONS.filter(
      (item) =>
        item.section === section.id &&
        allows(item.roles, role) &&
        featureOpen(item.feature, features),
    ),
  })).filter((group) => group.items.length > 0);

/** Which door a screen belongs to, so the sidebar keeps one active pill. */
export const activeDestinationId = (route: AdminRoute): string => {
  switch (route.name) {
    case 'dashboard':
      return 'dashboard';
    case 'content':
      return route.kind === 'post' ? 'posts' : 'pages';
    case 'editor':
      return 'pages';
    case 'forms':
      return 'forms';
    case 'media':
      return 'media';
    case 'commerce':
      return 'shop';
    case 'design':
      return 'design';
    case 'growth':
      return 'growth';
    case 'settings':
      return 'settings';
    default:
      return 'dashboard';
  }
};

/** The named screen behind an address, used by the breadcrumb. */
export const screenForPath = (path: string): NavScreen | undefined =>
  NAV_SCREENS.find((screen) => routePath(screen.route) === path);

/** The sidebar door behind a screen, used by the breadcrumb. */
export const destinationForRoute = (route: AdminRoute): NavDestination | undefined =>
  NAV_DESTINATIONS.find((item) => item.id === activeDestinationId(route));

/** Add-on a screen belongs to; the back office sends closed ones to the dashboard. */
export const featureForRoute = (route: AdminRoute): FeatureFlagKey | undefined => {
  if (route.name === 'commerce') return 'commerce';
  if (route.name === 'growth') {
    if (route.tab === 'analytics') return 'analytics';
    if (route.tab === 'newsletter') return 'newsletter';
    if (route.tab === 'apps') return 'apps';
  }
  return undefined;
};

export type TabbedScreen = 'design' | 'growth' | 'commerce' | 'settings';

/**
 * The tabs a role may actually open. A screen renders only these, so a tab can
 * never sit there and bounce its reader back to the dashboard.
 */
export const allowedTabs = <T extends string>(
  name: TabbedScreen,
  tabs: readonly T[],
  role: Role,
  features: readonly FeatureFlagKey[] = FEATURE_FLAG_KEYS,
): T[] =>
  tabs.filter((tab) => {
    const route = { name, tab } as unknown as AdminRoute;
    const feature = featureForRoute(route);
    return isRouteAllowed(route, role) && (feature === undefined || features.includes(feature));
  });

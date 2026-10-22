import { FEATURE_FLAG_KEYS, type FeatureFlagKey, type Role } from '@lumio/shared';
import type { IconName, MessageKey } from '@lumio/ui';
import type { AdminRoute } from '../route.js';

/**
 * The five main menus of docs/design/05-admin-ia.md 5.1. A menu entry is only
 * rendered when its screen exists and the role may open it, so there are never
 * links that lead nowhere.
 *
 * Labels are message keys, not text: the shell renders them through the
 * translator of the current language (AGENTS.md rule 4).
 */

export interface NavEntry {
  id: string;
  labelKey: MessageKey;
  icon: IconName;
  route: AdminRoute;
  /** Roles that may open it; omitted means everyone. */
  roles?: Role[];
  /** Add-on this screen belongs to; hidden while the site closed it. */
  feature?: FeatureFlagKey;
}

export interface NavMenu {
  id: string;
  labelKey: MessageKey;
  icon: IconName;
  /** Roles that may see the whole menu; omitted means everyone. */
  roles?: Role[];
  entries: NavEntry[];
}

const DESIGN_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SETTINGS_ROLES: Role[] = ['owner', 'admin'];
const GROWTH_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SHOP_ROLES: Role[] = ['owner', 'admin', 'editor'];
const SHOP_SETTINGS_ROLES: Role[] = ['owner', 'admin'];
const APP_ROLES: Role[] = ['owner', 'admin'];
/** Only the owner manages the plan and payment (docs/design/13-rbac.md). */
const BILLING_ROLES: Role[] = ['owner'];

export const NAV_MENUS: NavMenu[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: 'home',
    entries: [
      { id: 'dashboard', labelKey: 'nav.dashboard', icon: 'home', route: { name: 'dashboard' } },
    ],
  },
  {
    id: 'content',
    labelKey: 'nav.content',
    icon: 'file-text',
    entries: [
      {
        id: 'pages',
        labelKey: 'nav.pages',
        icon: 'file-text',
        route: { name: 'content', kind: 'page' },
      },
      { id: 'posts', labelKey: 'nav.posts', icon: 'pen', route: { name: 'content', kind: 'post' } },
      { id: 'forms', labelKey: 'nav.forms', icon: 'mail', route: { name: 'forms' } },
      { id: 'media', labelKey: 'nav.media', icon: 'image', route: { name: 'media' } },
      {
        id: 'products',
        labelKey: 'nav.products',
        icon: 'package',
        roles: SHOP_ROLES,
        feature: 'commerce',
        route: { name: 'commerce', tab: 'products' },
      },
      {
        id: 'orders',
        labelKey: 'nav.orders',
        icon: 'receipt',
        roles: SHOP_ROLES,
        feature: 'commerce',
        route: { name: 'commerce', tab: 'orders' },
      },
    ],
  },
  {
    id: 'design',
    labelKey: 'nav.design',
    icon: 'palette',
    roles: DESIGN_ROLES,
    entries: [
      {
        id: 'style',
        labelKey: 'nav.style',
        icon: 'palette',
        route: { name: 'design', tab: 'style' },
      },
      {
        id: 'menus',
        labelKey: 'nav.menus',
        icon: 'compass',
        route: { name: 'design', tab: 'menus' },
      },
      {
        id: 'header-footer',
        labelKey: 'nav.headerFooter',
        icon: 'layout',
        route: { name: 'design', tab: 'header-footer' },
      },
      {
        id: 'template',
        labelKey: 'nav.template',
        icon: 'layers',
        route: { name: 'design', tab: 'template' },
      },
      {
        id: 'sections',
        labelKey: 'nav.sections',
        icon: 'layers',
        route: { name: 'design', tab: 'sections' },
      },
    ],
  },
  {
    id: 'growth',
    labelKey: 'nav.growth',
    icon: 'trending-up',
    roles: GROWTH_ROLES,
    entries: [
      { id: 'seo', labelKey: 'nav.seo', icon: 'search', route: { name: 'growth', tab: 'seo' } },
      {
        id: 'analytics',
        labelKey: 'nav.analytics',
        icon: 'chart-bar',
        feature: 'analytics',
        route: { name: 'growth', tab: 'analytics' },
      },
      {
        id: 'newsletter',
        labelKey: 'nav.newsletter',
        icon: 'mail',
        feature: 'newsletter',
        route: { name: 'growth', tab: 'newsletter' },
      },
      {
        id: 'apps',
        labelKey: 'nav.apps',
        icon: 'layers',
        roles: APP_ROLES,
        feature: 'apps',
        route: { name: 'growth', tab: 'apps' },
      },
    ],
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    icon: 'settings',
    roles: SETTINGS_ROLES,
    entries: [
      {
        id: 'general',
        labelKey: 'nav.general',
        icon: 'settings',
        route: { name: 'settings', tab: 'general' },
      },
      {
        id: 'domain',
        labelKey: 'nav.domain',
        icon: 'globe',
        route: { name: 'settings', tab: 'domain' },
      },
      { id: 'team', labelKey: 'nav.team', icon: 'users', route: { name: 'settings', tab: 'team' } },
      {
        id: 'backup',
        labelKey: 'nav.backup',
        icon: 'database',
        route: { name: 'settings', tab: 'backup' },
      },
      {
        id: 'shop-settings',
        labelKey: 'nav.shopSettings',
        icon: 'shopping-bag',
        roles: SHOP_SETTINGS_ROLES,
        feature: 'commerce',
        route: { name: 'commerce', tab: 'settings' },
      },
      {
        id: 'billing',
        labelKey: 'nav.billing',
        icon: 'credit-card',
        roles: BILLING_ROLES,
        route: { name: 'settings', tab: 'billing' },
      },
    ],
  },
];

const allows = (roles: Role[] | undefined, role: Role): boolean =>
  roles === undefined || roles.includes(role);

/** Menus the given role can see, with entries it can open. */
export const visibleMenus = (
  role: Role,
  features: readonly FeatureFlagKey[] = FEATURE_FLAG_KEYS,
): NavMenu[] =>
  NAV_MENUS.filter((menu) => allows(menu.roles, role))
    .map((menu) => ({
      ...menu,
      entries: menu.entries.filter(
        (entry) =>
          allows(entry.roles, role) && (!entry.feature || features.includes(entry.feature)),
      ),
    }))
    .filter((menu) => menu.entries.length > 0);

/** Which menu a screen belongs to, for highlighting the sidebar. */
export const activeMenuId = (route: AdminRoute): string => {
  if (route.name === 'design') return 'design';
  if (route.name === 'growth') return 'growth';
  if (route.name === 'commerce') return route.tab === 'settings' ? 'settings' : 'content';
  if (route.name === 'settings') return 'settings';
  if (route.name === 'dashboard') return 'dashboard';
  return 'content';
};
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

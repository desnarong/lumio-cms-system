import { useState, type ReactNode } from 'react';
import type { ContentType, FeatureFlagKey, Role } from '@lumio/shared';
import {
  CommandPalette,
  Icon,
  IconButton,
  UI_LOCALE_LABELS,
  useT,
  type IconName,
  type UiLocale,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { routePath, type AdminRoute } from '../route.js';
import type { ContentCommandSource } from './commands.js';
import { activeMenuId, visibleMenus } from './nav.js';
import { useCommands } from './useCommands.js';

export interface AdminShellProps {
  route: AdminRoute;
  siteName: string;
  userName: string;
  role: Role;
  /** Add-ons the site still offers; screens of closed ones are hidden. */
  features?: readonly FeatureFlagKey[];
  /** Public address of the site; the "ดูเว็บ" button opens it. */
  publicUrl?: string;
  /** Roles that may create content see the "add page / post" palette commands. */
  canCreate?: boolean;
  onCreate?: (kind: ContentType) => void;
  /** Searches pages and posts for the command palette. */
  searchContent?: (query: string) => Promise<ContentCommandSource[]>;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  /** Language of the back office; the switcher changes it (AGENTS.md rule 4). */
  locale?: UiLocale;
  onLocaleChange?: (locale: UiLocale) => void;
  children: ReactNode;
}

const ROLE_KEYS = {
  owner: 'role.owner',
  admin: 'role.admin',
  editor: 'role.editor',
  author: 'role.author',
  viewer: 'role.viewer',
} as const;

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'L';

/**
 * Sidebar + top bar around every back-office screen (docs/design/05-admin-ia.md
 * 5.3). Icons instead of emoji, one clear active pill, and on phones the sidebar
 * becomes a bottom bar so editing still works.
 */
export const AdminShell = ({
  route,
  siteName,
  userName,
  role,
  features,
  publicUrl,
  canCreate = true,
  onCreate,
  searchContent,
  onNavigate,
  onSignOut,
  locale = 'th',
  onLocaleChange,
  children,
}: AdminShellProps) => {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const menus = visibleMenus(role, features);
  const activeMenu = activeMenuId(route);
  const currentPath = routePath(route);

  const commands = useCommands({
    t,
    role,
    features,
    canCreate,
    ...(publicUrl ? { publicUrl } : {}),
    onNavigate,
    ...(onCreate ? { onCreate } : {}),
    onSignOut,
    ...(searchContent ? { searchContent } : {}),
  });

  const link = (path: string, label: string, icon: IconName, current: boolean, key: string) => (
    <a
      key={key}
      className={cn('shell-link', current && 'shell-link--active')}
      href={path}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(path);
      }}
    >
      <span className="shell-link__icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <span className="shell-link__label">{label}</span>
    </a>
  );

  return (
    <div className={cn('shell', collapsed && 'shell--collapsed')}>
      <aside className="shell-sidebar" aria-label={t('shell.mainMenu')}>
        <div className="shell-sidebar__brand">
          <span className="shell-logo" aria-hidden="true">
            <Icon name="sparkles" size={18} />
          </span>
          <span className="shell-sidebar__brand-text">
            <span className="shell-sidebar__brand-name">Lumio</span>
            <span className="shell-sidebar__brand-tagline">{t('shell.brandTagline')}</span>
          </span>
        </div>

        <nav className="shell-nav">
          {menus.map((menu) => {
            const isActive = menu.id === activeMenu;
            const single = menu.entries.length === 1;

            return (
              <div key={menu.id} className="shell-nav__group">
                {single ? (
                  link(
                    routePath(menu.entries[0]!.route),
                    t(menu.labelKey),
                    menu.icon,
                    isActive,
                    `${menu.id}-root`,
                  )
                ) : (
                  <p className={cn('shell-nav__title', isActive && 'shell-nav__title--active')}>
                    <span className="shell-nav__title-icon" aria-hidden="true">
                      <Icon name={menu.icon} size={15} />
                    </span>
                    <span className="shell-nav__title-text">{t(menu.labelKey)}</span>
                  </p>
                )}

                <div className="shell-nav__sub">
                  {single
                    ? null
                    : menu.entries.map((entry) =>
                        link(
                          routePath(entry.route),
                          t(entry.labelKey),
                          entry.icon,
                          routePath(entry.route) === currentPath,
                          `${menu.id}-${entry.id}`,
                        ),
                      )}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shell-sidebar__footer">
          <div className="shell-user">
            <span className="shell-user__avatar" aria-hidden="true">
              {initials(userName)}
            </span>
            <span className="shell-user__body">
              <span className="shell-user__name">{userName}</span>
              <span className="shell-user__role">{t(ROLE_KEYS[role])}</span>
            </span>
          </div>
          <button type="button" className="shell-signout" onClick={onSignOut}>
            <Icon name="log-out" size={18} />
            <span className="shell-link__label">{t('shell.signOut')}</span>
          </button>
          <IconButton
            className="shell-collapse"
            aria-label={t('shell.collapseMenu')}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Icon name="panel-left" size={18} />
          </IconButton>
        </div>
      </aside>

      <div className="shell-body">
        <header className="shell-topbar">
          <div className="shell-topbar__greeting">
            <span className="shell-topbar__hello">{t('shell.greeting', { name: userName })}</span>
            <span className="shell-topbar__site">
              {siteName ? (
                <>
                  <Icon name="globe" size={14} />
                  {siteName}
                </>
              ) : null}
            </span>
          </div>

          <div className="shell-topbar__actions">
            <button
              type="button"
              className="shell-topbar__search"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={commands.openPalette}
            >
              <Icon name="search" size={16} />
              <span className="shell-topbar__search-label">{t('shell.search')}</span>
              <kbd className="shell-topbar__search-kbd">⌘K</kbd>
            </button>
            {publicUrl ? (
              <a className="shell-topbar__view" href={publicUrl} target="_blank" rel="noreferrer">
                <Icon name="external-link" size={16} />
                <span>{t('shell.viewSite')}</span>
              </a>
            ) : null}
            {onLocaleChange ? (
              <button
                type="button"
                className="shell-topbar__language"
                aria-label={t('shell.language')}
                title={t('shell.language')}
                onClick={() => onLocaleChange(locale === 'th' ? 'en' : 'th')}
              >
                <Icon name="globe" size={16} />
                <span>{locale === 'th' ? UI_LOCALE_LABELS.en : UI_LOCALE_LABELS.th}</span>
              </button>
            ) : null}
            <IconButton
              className="shell-topbar__signout"
              aria-label={t('shell.signOut')}
              onClick={onSignOut}
            >
              <Icon name="log-out" size={18} />
            </IconButton>
          </div>
        </header>

        <main className="shell-content">{children}</main>
      </div>

      <nav className="shell-bottomnav" aria-label={t('shell.mobileMenu')}>
        {menus.map((menu) =>
          link(
            routePath(menu.entries[0]!.route),
            t(menu.labelKey),
            menu.icon,
            menu.id === activeMenu,
            `bottom-${menu.id}`,
          ),
        )}
      </nav>

      <CommandPalette
        open={commands.open}
        query={commands.query}
        sections={commands.sections}
        onQueryChange={commands.setQuery}
        onSelect={commands.select}
        onClose={commands.closePalette}
      />
    </div>
  );
};

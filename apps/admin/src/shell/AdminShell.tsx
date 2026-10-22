import type { ReactNode } from 'react';
import type { ContentType, FeatureFlagKey, Role } from '@lumio/shared';
import { CommandPalette, UI_LOCALE_LABELS, useT, type UiLocale } from '@lumio/ui';
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

/**
 * Sidebar + top bar around every back-office screen (docs/design/05-admin-ia.md
 * 5.3). On phones the sidebar becomes a bottom bar so editing still works.
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

  const link = (path: string, label: string, icon: string, current: boolean, key: string) => (
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
        {icon}
      </span>
      <span className="shell-link__label">{label}</span>
    </a>
  );

  return (
    <div className="shell">
      <aside className="shell-sidebar" aria-label={t('shell.mainMenu')}>
        <div className="shell-sidebar__brand">
          <span aria-hidden="true">🌿</span>
          <span className="shell-sidebar__brand-text">Lumio</span>
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
                  <p
                    className={cn('shell-nav__title', isActive && 'shell-nav__title--active')}
                  >
                    <span className="shell-link__icon" aria-hidden="true">
                      {menu.icon}
                    </span>
                    <span className="shell-link__label">{t(menu.labelKey)}</span>
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
      </aside>

      <div className="shell-body">
        <header className="shell-topbar">
          <div className="shell-topbar__greeting">
            <span className="shell-topbar__hello">{t('shell.greeting', { name: userName })}</span>
            <span className="shell-topbar__site">{siteName}</span>
          </div>

          <div className="shell-topbar__actions">
            <button
              type="button"
              className="shell-topbar__search"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={commands.openPalette}
            >
              <span aria-hidden="true">🔍</span>
              <span className="shell-topbar__search-label">{t('shell.search')}</span>
              <kbd className="shell-topbar__search-kbd">⌘K</kbd>
            </button>
            {publicUrl ? (
              <a className="shell-topbar__view" href={publicUrl} target="_blank" rel="noreferrer">
                {t('shell.viewSite')}
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
                {locale === 'th' ? UI_LOCALE_LABELS.en : UI_LOCALE_LABELS.th}
              </button>
            ) : null}
            <button type="button" className="shell-topbar__signout" onClick={onSignOut}>
              {t('shell.signOut')}
            </button>
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

import { useState, type ReactNode } from 'react';
import type { ContentType, FeatureFlagKey, Role } from '@lumio/shared';
import {
  CommandPalette,
  Icon,
  IconButton,
  SplitButton,
  UI_LOCALE_LABELS,
  useT,
  type IconName,
  type UiLocale,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { routePath, type AdminRoute } from '../route.js';
import type { UpdatesApi } from '../updates/api.js';
import { VersionPanel } from '../updates/VersionPanel.js';
import type { ContentCommandSource } from './commands.js';
import { activeDestinationId, visibleSidebar } from './nav.js';
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
  /** Roles that may create content see the "add page / post" button and commands. */
  canCreate?: boolean;
  onCreate?: (kind: ContentType) => void;
  /** Searches pages and posts for the command palette. */
  searchContent?: (query: string) => Promise<ContentCommandSource[]>;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  /** Language of the back office; the switcher changes it (AGENTS.md rule 4). */
  locale?: UiLocale;
  onLocaleChange?: (locale: UiLocale) => void;
  /** Version badge and update notice; omitted by the chrome-only tests. */
  updates?: UpdatesApi;
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
 * The back-office chrome (docs/design/05-admin-ia.md 5.3): one flat sidebar of
 * nine destinations, a thin top bar with the four things every screen needs
 * (search, create, view the site, language) and a single content column.
 *
 * The back office is built for a desktop: below 1024px it keeps the same layout
 * and only says so, instead of turning into a second, worse product. The public
 * site is the part that has to work on a phone.
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
  updates,
  children,
}: AdminShellProps) => {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const groups = visibleSidebar(role, features);
  const activeId = activeDestinationId(route);

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
      title={collapsed ? label : undefined}
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
      <a className="shell-skip" href="#shell-content">
        {t('shell.skipToContent')}
      </a>

      <aside className="shell-sidebar" aria-label={t('shell.mainMenu')}>
        <a
          className="shell-brand"
          href={routePath({ name: 'dashboard' })}
          title={siteName || 'Lumio'}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(routePath({ name: 'dashboard' }));
          }}
        >
          <span className="shell-logo" aria-hidden="true">
            <Icon name="sparkles" size={18} />
          </span>
          <span className="shell-brand__text">
            <span className="shell-brand__name">Lumio</span>
            <span className="shell-brand__site">
              <Icon name="globe" size={12} />
              <span className="shell-brand__site-name">{siteName}</span>
            </span>
          </span>
        </a>

        <nav className="shell-nav">
          {groups.map((group) => (
            <div className="shell-nav__group" key={group.section.id}>
              <p className="shell-nav__label" id={`shell-nav-${group.section.id}`}>
                {t(group.section.labelKey)}
              </p>
              <ul className="shell-nav__list" aria-labelledby={`shell-nav-${group.section.id}`}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    {link(
                      item.path,
                      t(item.labelKey),
                      item.icon,
                      item.id === activeId,
                      `nav-${item.id}`,
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shell-sidebar__footer">
          {updates ? <VersionPanel api={updates} /> : null}
          <button
            type="button"
            className="shell-collapse"
            aria-expanded={!collapsed}
            title={collapsed ? t('shell.expandMenu') : t('shell.collapseMenu')}
            onClick={() => setCollapsed((value) => !value)}
          >
            <span className="shell-link__icon" aria-hidden="true">
              <Icon name="panel-left" size={18} />
            </span>
            <span className="shell-link__label">
              {collapsed ? t('shell.expandMenu') : t('shell.collapseMenu')}
            </span>
          </button>
        </div>
      </aside>

      <div className="shell-body">
        <header className="shell-topbar">
          <button
            type="button"
            className="shell-search"
            aria-keyshortcuts="Control+K Meta+K"
            onClick={commands.openPalette}
          >
            <Icon name="search" size={16} />
            <span className="shell-search__label">{t('shell.search')}</span>
            <kbd className="shell-search__kbd">⌘K</kbd>
          </button>

          <div className="shell-topbar__actions">
            {canCreate && onCreate ? (
              <SplitButton
                className="shell-create"
                variant="secondary"
                actions={[
                  { label: t('command.newPage'), onSelect: () => onCreate('page') },
                  { label: t('command.newPost'), onSelect: () => onCreate('post') },
                ]}
                onClick={() => onCreate('page')}
              >
                <Icon name="plus" size={16} />
                <span>{t('shell.create')}</span>
              </SplitButton>
            ) : null}

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

            <span className="shell-user" title={`${userName} — ${t(ROLE_KEYS[role])}`}>
              <span className="shell-user__avatar" aria-hidden="true">
                {initials(userName)}
              </span>
              <span className="shell-user__body">
                <span className="shell-user__name">{userName}</span>
                <span className="shell-user__role">{t(ROLE_KEYS[role])}</span>
              </span>
            </span>

            <IconButton
              className="shell-topbar__signout"
              aria-label={t('shell.signOut')}
              title={t('shell.signOut')}
              onClick={onSignOut}
            >
              <Icon name="log-out" size={18} />
            </IconButton>
          </div>
        </header>

        <p className="shell-narrow">{t('shell.smallScreen')}</p>

        <main className="shell-content" id="shell-content" tabIndex={-1}>
          {children}
        </main>
      </div>

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

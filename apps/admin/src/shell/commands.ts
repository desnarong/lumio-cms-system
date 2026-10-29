import {
  filterCommands,
  groupCommands,
  type CommandItem,
  type ContentType,
  type FeatureFlagKey,
  type Role,
} from '@lumio/shared';
import type { CommandPaletteSection, Translate } from '@lumio/ui';
import { routePath } from '../route.js';
import { destinationForRoute, NAV_SECTIONS, visibleScreens, type NavSectionId } from './nav.js';

/**
 * Builds the searchable list behind the command palette (docs/design/04-ux.md
 * 4.3). Navigation comes from the same screen list the sidebar and the tabs are
 * built from, so the palette can never offer a screen the role cannot open.
 */

const NAV_PREFIX = 'nav:';
const ACTION_PREFIX = 'action:';
const CONTENT_PREFIX = 'content:';

const sectionLabelKey = (section: NavSectionId) =>
  NAV_SECTIONS.find((entry) => entry.id === section)?.labelKey ?? 'nav.section.work';

/** Every screen the role may open, as "go to" commands, in one language. */
export const navigationCommands = (
  role: Role,
  t: Translate,
  features?: readonly FeatureFlagKey[],
): CommandItem[] =>
  visibleScreens(role, features).map((screen) => {
    // A tab is also found by the name of the door it sits behind, so searching
    // for "ตั้งค่า" still reaches the settings screens.
    const destination = destinationForRoute(screen.route);
    const keywords = [
      t(sectionLabelKey(screen.section)),
      ...(destination && destination.labelKey !== screen.labelKey ? [t(destination.labelKey)] : []),
    ];

    return {
      id: `${NAV_PREFIX}${routePath(screen.route)}`,
      label: t(screen.labelKey),
      group: 'goto' as const,
      keywords,
    };
  });

export interface ActionCommandOptions {
  publicUrl?: string;
  /** Only roles that may create content get the create commands. */
  canCreate?: boolean;
  /** Translator of the current language; Thai when omitted. */
  t: Translate;
}

/** Quick actions: create a page or post, open the site, sign out. */
export const actionCommands = ({
  publicUrl,
  canCreate = true,
  t,
}: ActionCommandOptions): CommandItem[] => {
  const items: CommandItem[] = [];

  if (canCreate) {
    items.push(
      {
        id: `${ACTION_PREFIX}new-page`,
        label: t('command.newPage'),
        group: 'action',
        keywords: ['page', 'new'],
      },
      {
        id: `${ACTION_PREFIX}new-post`,
        label: t('command.newPost'),
        group: 'action',
        keywords: ['post', 'new'],
      },
    );
  }
  if (publicUrl) {
    items.push({
      id: `${ACTION_PREFIX}view-site`,
      label: t('command.viewSite'),
      group: 'action',
      keywords: ['view', 'site'],
    });
  }
  items.push({
    id: `${ACTION_PREFIX}sign-out`,
    label: t('command.signOut'),
    group: 'action',
    keywords: ['logout', 'sign out'],
  });

  return items;
};

export interface ContentCommandSource {
  id: string;
  title: string;
  type: ContentType;
  slug: string;
}

/** Pages and posts the user searched for, as "open" commands. */
export const contentCommands = (items: ContentCommandSource[], t: Translate): CommandItem[] =>
  items.map((item) => ({
    id: `${CONTENT_PREFIX}${item.id}`,
    label: item.title,
    group: 'content' as const,
    hint: `/${item.slug}`,
    keywords: [item.slug, item.type === 'post' ? t('nav.posts') : t('nav.pages')],
  }));

/** Filters and groups a command list into the sections the palette renders. */
export const commandSections = (
  commands: CommandItem[],
  query: string,
  t: Translate,
): CommandPaletteSection[] =>
  groupCommands(filterCommands(commands, query), {
    goto: t('palette.group.goto'),
    action: t('palette.group.action'),
    content: t('palette.group.content'),
  }).map((section) => ({
    id: section.group,
    label: section.label,
    items: section.items.map((item) => ({
      id: item.id,
      label: item.label,
      ...(item.hint ? { hint: item.hint } : {}),
    })),
  }));

export type CommandIntent =
  | { kind: 'navigate'; path: string }
  | { kind: 'open-content'; contentId: string }
  | { kind: 'create'; contentType: ContentType }
  | { kind: 'view-site' }
  | { kind: 'sign-out' }
  | { kind: 'unknown' };

/** Turns a command id back into the action the shell should take. */
export const parseCommand = (id: string): CommandIntent => {
  if (id.startsWith(NAV_PREFIX)) return { kind: 'navigate', path: id.slice(NAV_PREFIX.length) };
  if (id.startsWith(CONTENT_PREFIX)) {
    return { kind: 'open-content', contentId: id.slice(CONTENT_PREFIX.length) };
  }
  if (id.startsWith(ACTION_PREFIX)) {
    const action = id.slice(ACTION_PREFIX.length);
    if (action === 'new-page') return { kind: 'create', contentType: 'page' };
    if (action === 'new-post') return { kind: 'create', contentType: 'post' };
    if (action === 'view-site') return { kind: 'view-site' };
    if (action === 'sign-out') return { kind: 'sign-out' };
  }
  return { kind: 'unknown' };
};

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentType, FeatureFlagKey, Role } from '@lumio/shared';
import type { CommandPaletteEntry, CommandPaletteSection, Translate } from '@lumio/ui';
import {
  actionCommands,
  commandSections,
  contentCommands,
  navigationCommands,
  parseCommand,
  type ContentCommandSource,
} from './commands.js';

export interface UseCommandsOptions {
  /** Translator of the current language, so the palette matches the shell. */
  t: Translate;
  role: Role;
  /** Add-ons the site still offers; screens of closed ones leave the palette. */
  features?: readonly FeatureFlagKey[];
  publicUrl?: string;
  /** Only roles that may create content get the create commands. */
  canCreate?: boolean;
  onNavigate: (path: string) => void;
  onCreate?: (kind: ContentType) => void;
  onSignOut: () => void;
  /** Searches the site's pages and posts; when absent only commands are offered. */
  searchContent?: (query: string) => Promise<ContentCommandSource[]>;
}

export interface CommandsController {
  open: boolean;
  query: string;
  sections: CommandPaletteSection[];
  openPalette: () => void;
  closePalette: () => void;
  setQuery: (value: string) => void;
  select: (entry: CommandPaletteEntry) => void;
}

/** Minimum query length before content is searched, so typing does not spam the API. */
const MIN_SEARCH_LENGTH = 2;

/**
 * Wires the command palette (docs/design/04-ux.md 4.3): the `Ctrl/⌘+K` shortcut,
 * the filtered command list, and the action each command runs. Content results are
 * fetched lazily once the user has typed enough.
 */
export const useCommands = ({
  t,
  role,
  features,
  publicUrl,
  canCreate = true,
  onNavigate,
  onCreate,
  onSignOut,
  searchContent,
}: UseCommandsOptions): CommandsController => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [content, setContent] = useState<ContentCommandSource[]>([]);

  const base = useMemo(
    () => [
      ...navigationCommands(role, t, features),
      ...actionCommands({ t, canCreate, ...(publicUrl ? { publicUrl } : {}) }),
    ],
    [role, features, canCreate, publicUrl, t],
  );

  const sections = useMemo(
    () => commandSections([...base, ...contentCommands(content, t)], query, t),
    [base, content, query, t],
  );

  const openPalette = useCallback(() => {
    setQuery('');
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setContent([]);
  }, []);

  // `Ctrl/⌘+K` opens the palette from anywhere in the back office.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Content search, debounced and cancelled when the palette closes.
  useEffect(() => {
    if (!open || !searchContent) {
      return undefined;
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setContent([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      void searchContent(trimmed)
        .then((results) => {
          if (active) setContent(results);
        })
        .catch(() => {
          if (active) setContent([]);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, searchContent]);

  const select = useCallback(
    (entry: CommandPaletteEntry) => {
      const intent = parseCommand(entry.id);
      closePalette();

      switch (intent.kind) {
        case 'navigate':
          onNavigate(intent.path);
          break;
        case 'open-content':
          onNavigate(`/editor/${intent.contentId}`);
          break;
        case 'create':
          onCreate?.(intent.contentType);
          break;
        case 'view-site':
          if (publicUrl) window.open(publicUrl, '_blank', 'noreferrer');
          break;
        case 'sign-out':
          onSignOut();
          break;
        default:
          break;
      }
    },
    [closePalette, onNavigate, onCreate, onSignOut, publicUrl],
  );

  return { open, query, sections, openPalette, closePalette, setQuery, select };
};

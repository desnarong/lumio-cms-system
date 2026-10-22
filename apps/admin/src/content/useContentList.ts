import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentStatus, ContentSummary } from '@lumio/shared';
import { translateNow, useT, useToast } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { ContentApi } from '../editor/api.js';

export const contentErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

const PAGE_SIZE = 20;

export interface ContentListController {
  items: ContentSummary[];
  query: string;
  status: ContentStatus | 'all';
  /** Language filter, or 'all' for every language (docs/design/17-i18n.md 17.3). */
  locale: string | 'all';
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  cursor: string | null;
  setQuery: (value: string) => void;
  setStatus: (value: ContentStatus | 'all') => void;
  setLocale: (value: string | 'all') => void;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  /** Moves an item to the trash; the toast offers an undo. */
  archive: (item: ContentSummary) => Promise<void>;
  /** Brings a trashed item back as a draft. */
  restore: (item: ContentSummary) => Promise<void>;
  /** Deletes a trashed item for good. Irreversible, so the caller confirms first. */
  purge: (item: ContentSummary) => Promise<void>;
}

/**
 * State for the content list (docs/design/05-admin-ia.md 5.4): search, status
 * filter and cursor pagination. Deleting is a reversible move to the trash, so it
 * always offers "เลิกทำ" instead of a confirm dialog.
 */
export const useContentList = (
  api: ContentApi,
  kind: 'page' | 'post',
): ContentListController => {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<ContentSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ContentStatus | 'all'>('all');
  const [locale, setLocale] = useState<string | 'all'>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await apiRef.current.list({
        type: kind,
        limit: PAGE_SIZE,
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(status === 'all' ? {} : { status }),
        ...(locale === 'all' ? {} : { locale }),
      });
      setItems(page.items);
      setCursor(page.cursor);
    } catch (loadError) {
      setError(contentErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, kind, status, locale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await apiRef.current.list({
        type: kind,
        limit: PAGE_SIZE,
        cursor,
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(status === 'all' ? {} : { status }),
        ...(locale === 'all' ? {} : { locale }),
      });
      setItems((current) => [...current, ...page.items]);
      setCursor(page.cursor);
    } catch (loadError) {
      setError(contentErrorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, debouncedQuery, kind, status, locale]);

  /** Puts a status back, used by the undo of "move to trash". */
  const revertStatus = useCallback(
    async (item: ContentSummary, status: ContentStatus) => {
      try {
        await apiRef.current.update(item.id, { status });
        toast.push({ tone: 'success', title: t('content.restoredToast') });
        await reload();
      } catch (restoreError) {
        toast.push({ tone: 'danger', title: contentErrorMessage(restoreError) });
      }
    },
    [reload, toast],
  );

  const restore = useCallback(
    async (item: ContentSummary) => {
      try {
        await apiRef.current.restore(item.id);
        toast.push({ tone: 'success', title: t('settings.backup.restored'), description: t('settings.backup.restoredBody') });
        await reload();
      } catch (restoreError) {
        toast.push({ tone: 'danger', title: contentErrorMessage(restoreError) });
      }
    },
    [reload, toast],
  );

  const purge = useCallback(
    async (item: ContentSummary) => {
      const snapshot = items;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      try {
        await apiRef.current.remove(item.id);
        toast.push({ tone: 'danger', title: t('content.purgedToast'), description: item.title });
      } catch (purgeError) {
        setItems(snapshot);
        toast.push({ tone: 'danger', title: contentErrorMessage(purgeError) });
      }
    },
    [items, toast],
  );

  const archive = useCallback(
    async (item: ContentSummary) => {
      const previousStatus = item.status;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      try {
        await apiRef.current.update(item.id, { status: 'archived' });
        toast.push({
          tone: 'success',
          title: t('content.trashedToast'),
          undo: {
            label: t('common.undo'),
            onClick: () => void revertStatus(item, previousStatus),
          },
        });
      } catch (archiveError) {
        toast.push({ tone: 'danger', title: contentErrorMessage(archiveError) });
        await reload();
      }
    },
    [reload, revertStatus, toast],
  );

  return {
    items,
    query,
    status,
    locale,
    loading,
    loadingMore,
    error,
    cursor,
    setQuery,
    setStatus,
    setLocale,
    reload,
    loadMore,
    archive,
    restore,
    purge,
  };
};

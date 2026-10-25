import { useCallback, useEffect, useRef, useState } from 'react';
import type { BulkUpdateMediaInput, FocalPoint, MediaCrop, MediaItem } from '@lumio/shared';
import { translateNow, useT, useToast } from '@lumio/ui';
import { ApiError } from '../editor/api.js';
import type { MediaApi } from './api.js';
import { waitForRender } from './wait-for-render.js';

export const mediaErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

export interface MediaLibraryController {
  items: MediaItem[];
  folders: string[];
  query: string;
  folder: string | null;
  selectedId: string | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  setQuery: (value: string) => void;
  setFolder: (folder: string | null) => void;
  select: (id: string) => void;
  reload: () => Promise<void>;
  upload: (files: readonly File[]) => Promise<void>;
  remove: (item: MediaItem) => Promise<void>;
  saveAlt: (item: MediaItem, alt: string) => Promise<void>;
  /**
   * Describes and/or moves a selection in one request. The undo restores each
   * image's previous text and folder, so a wrong bulk edit is never final.
   */
  bulkUpdate: (input: BulkUpdateMediaInput) => Promise<void>;
  /**
   * Saves where the image should stay in frame; a null point puts it back to the
   * centre. Every save offers undo, like the rest of the library.
   */
  saveFocalPoint: (item: MediaItem, point: FocalPoint | null) => Promise<void>;
  /**
   * Cuts the rendered sizes from a window; null restores the full picture. The
   * image goes back to `processing` until the worker writes the new files.
   */
  saveCrop: (item: MediaItem, crop: MediaCrop | null) => Promise<void>;
}

/**
 * Shared state for every media screen: the picker dialog, the library page and
 * anything else that browses images. Deletes are soft and always offer undo
 * (docs/design/04-ux.md), and autosave-style actions never raise a Toast.
 */
export const useMediaLibrary = (api: MediaApi): MediaLibraryController => {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, knownFolders] = await Promise.all([
        apiRef.current.list({ q: query || undefined, folder: folder ?? undefined }),
        apiRef.current.folders(),
      ]);
      setItems(page.items);
      setFolders(knownFolders);
      setSelectedId((current) =>
        current && page.items.some((item) => item.id === current)
          ? current
          : (page.items[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(mediaErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [query, folder]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const restore = useCallback(
    async (item: MediaItem) => {
      try {
        await apiRef.current.restore(item.id);
        setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
        toast.push({ tone: 'success', title: t('media.restored') });
      } catch (restoreError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(restoreError) });
      }
    },
    [t, toast],
  );

  const remove = useCallback(
    async (item: MediaItem) => {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      try {
        await apiRef.current.remove(item.id);
        toast.push({
          tone: 'success',
          title: t('media.deleted'),
          undo: { label: t('common.undo'), onClick: () => void restore(item) },
        });
      } catch (removeError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(removeError) });
        await reload();
      }
    },
    [reload, restore, t, toast],
  );

  /** The worker re-renders the sizes after upload or crop; poll until the row is ready. */
  const pollRender = useCallback(
    (id: string) =>
      waitForRender(id, {
        get: (mediaId) => apiRef.current.get(mediaId),
        onUpdate: (latest) =>
          setItems((current) => current.map((entry) => (entry.id === latest.id ? latest : entry))),
      }),
    [],
  );

  const upload = useCallback(
    async (files: readonly File[]) => {
      setUploading(true);
      try {
        const created: MediaItem[] = [];
        for (const file of files) {
          created.push(await apiRef.current.upload(file, folder ? { folder } : undefined));
        }
        setItems((current) => [...created, ...current]);
        if (created[0]) setSelectedId(created[0].id);
        // The uploaded row is still being resized in the worker; keep polling so
        // it becomes pickable without closing and reopening the dialog.
        for (const item of created) {
          if (item.status === 'processing' || item.status === 'pending') {
            void pollRender(item.id);
          }
        }
        setFolders(await apiRef.current.folders());
        toast.push({
          tone: 'success',
          title:
            created.length > 1
              ? t('media.uploadedCount', { count: created.length })
              : t('media.uploaded'),
        });
      } catch (uploadError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(uploadError) });
      } finally {
        setUploading(false);
      }
    },
    [folder, pollRender, t, toast],
  );

  const saveAlt = useCallback(
    async (item: MediaItem, alt: string) => {
      try {
        const updated = await apiRef.current.update(item.id, { alt });
        setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
        toast.push({ tone: 'success', title: t('media.altSaved') });
      } catch (saveError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(saveError) });
      }
    },
    [t, toast],
  );

  const bulkUpdate = useCallback(
    async (input: BulkUpdateMediaInput) => {
      const previous = itemsRef.current.filter((item) => input.ids.includes(item.id));
      try {
        const result = await apiRef.current.bulkUpdate(input);
        setItems((current) => {
          const changed = new Map(result.items.map((item) => [item.id, item]));
          return current.map((item) => changed.get(item.id) ?? item);
        });
        toast.push({
          tone: 'success',
          title: t('media.bulkSaved', { count: result.count }),
          undo: {
            label: t('common.undo'),
            onClick: () => {
              void (async () => {
                for (const item of previous) {
                  try {
                    await apiRef.current.update(item.id, {
                      alt: item.alt,
                      folder: item.folder,
                    });
                  } catch {
                    // Keep undoing the rest; a refresh shows the true state.
                  }
                }
                await reload();
              })();
            },
          },
        });
      } catch (saveError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(saveError) });
      }
    },
    [reload, t, toast],
  );

  const saveFocalPoint = useCallback(
    async (item: MediaItem, point: FocalPoint | null) => {
      const previous = item.focalPoint;
      try {
        const updated = await apiRef.current.update(item.id, { focalPoint: point });
        setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
        toast.push({
          tone: 'success',
          title: t('media.focalSaved'),
          undo: {
            label: t('common.undo'),
            onClick: () => {
              void apiRef.current
                .update(item.id, { focalPoint: previous })
                .then((restored) =>
                  setItems((current) =>
                    current.map((entry) => (entry.id === item.id ? restored : entry)),
                  ),
                );
            },
          },
        });
      } catch (saveError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(saveError) });
      }
    },
    [t, toast],
  );

  const saveCrop = useCallback(
    async (item: MediaItem, crop: MediaCrop | null) => {
      const previous = item.crop ?? null;
      try {
        const updated = await apiRef.current.update(item.id, { crop });
        setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
        if (updated.status === 'processing') void pollRender(updated.id);
        toast.push({
          tone: 'success',
          title: crop ? t('media.cropSaved') : t('media.cropCleared'),
          undo: {
            label: t('common.undo'),
            onClick: () => {
              void apiRef.current
                .update(item.id, { crop: previous })
                .then((restored) => {
                  setItems((current) =>
                    current.map((entry) => (entry.id === item.id ? restored : entry)),
                  );
                  if (restored.status === 'processing') void pollRender(restored.id);
                });
            },
          },
        });
      } catch (saveError) {
        toast.push({ tone: 'danger', title: mediaErrorMessage(saveError) });
      }
    },
    [pollRender, t, toast],
  );

  return {
    items,
    folders,
    query,
    folder,
    selectedId,
    loading,
    uploading,
    error,
    setQuery,
    setFolder,
    select: setSelectedId,
    reload,
    upload,
    remove,
    saveAlt,
    bulkUpdate,
    saveFocalPoint,
    saveCrop,
  };
};
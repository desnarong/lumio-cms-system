import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MediaItem } from '@lumio/shared';
import { MediaPickerProvider, type MediaPickerApi, type PickedImage } from '@lumio/blocks';
import { Button, Modal, useT } from '@lumio/ui';
import type { AiApi } from '../ai/api.js';
import type { MediaApi } from './api.js';
import { MediaLibraryBody } from './MediaLibraryBody.js';
import { useMediaLibrary } from './useMediaLibrary.js';

/** Everything a block panel needs, taken straight from the library row. */
export const toPickedImage = (item: MediaItem): PickedImage => ({
  url: item.url,
  mediaId: item.id,
  srcSet: item.srcSet ?? undefined,
  avifSrcSet: item.avifSrcSet ?? undefined,
  focalPoint: item.focalPoint ?? undefined,
  width: item.width ?? undefined,
  height: item.height ?? undefined,
  ...(item.alt ? { alt: item.alt } : {}),
});

interface PendingPick {
  resolve: (value: PickedImage | null) => void;
}

/**
 * Real media library behind the block panels' picker contract. Panels ask for an
 * image and never import the library, so this provider is the only place the
 * dialog is mounted (docs/design/12-api.md 12.6).
 */
export const MediaLibraryProvider = ({
  api,
  ai,
  children,
}: {
  api: MediaApi;
  /** Optional assistant, so the picker can also suggest alt text. */
  ai?: AiApi;
  children: ReactNode;
}) => {
  const t = useT();
  const [pending, setPending] = useState<PendingPick | null>(null);
  const [aspect, setAspect] = useState<'square' | 'wide'>('wide');
  const pendingRef = useRef<PendingPick | null>(null);

  const settle = useCallback((value: PickedImage | null) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  const pickerApi = useMemo<MediaPickerApi>(
    () => ({
      pick: (options) =>
        new Promise<PickedImage | null>((resolve) => {
          const next = { resolve };
          pendingRef.current = next;
          setAspect(options?.aspect ?? 'wide');
          setPending(next);
        }),
    }),
    [],
  );

  return (
    <MediaPickerProvider api={pickerApi}>
      {children}
      {pending ? (
        <Modal
          open
          size="lg"
          title={t('media.pickTitle')}
          description={aspect === 'square' ? t('media.pickSquareHint') : t('media.pickWideHint')}
          className="media-dialog"
          onClose={() => settle(null)}
          footer={
            <div className="editor-modal-actions">
              <Button variant="ghost" onClick={() => settle(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          }
        >
          <PickerDialogBody
            api={api}
            {...(ai ? { ai } : {})}
            onPick={(item) => settle(toPickedImage(item))}
          />
        </Modal>
      ) : null}
    </MediaPickerProvider>
  );
};

const PickerDialogBody = ({
  api,
  ai,
  onPick,
}: {
  api: MediaApi;
  ai?: AiApi;
  onPick: (item: MediaItem) => void;
}) => {
  const library = useMediaLibrary(api);

  return (
    <MediaLibraryBody
      compact
      pickMode
      items={library.items}
      folders={library.folders}
      query={library.query}
      folder={library.folder}
      loading={library.loading}
      error={library.error}
      uploading={library.uploading}
      selectedId={library.selectedId}
      onQueryChange={library.setQuery}
      onFolderChange={library.setFolder}
      onSelect={library.select}
      onUpload={(files) => void library.upload(files)}
      onDelete={(item) => void library.remove(item)}
      onSaveAlt={(item, alt) => void library.saveAlt(item, alt)}
      onBulkUpdate={(input) => void library.bulkUpdate(input)}
      onSaveFocalPoint={(item, point) => void library.saveFocalPoint(item, point)}
      onSaveCrop={(item, crop) => void library.saveCrop(item, crop)}
      onConfirmPick={onPick}
      onRetry={() => void library.reload()}
      {...(ai ? { ai } : {})}
    />
  );
};

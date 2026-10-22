import { useT } from '@lumio/ui';
import { MediaLibraryBody } from './MediaLibraryBody.js';
import type { AiApi } from '../ai/api.js';
import type { MediaApi } from './api.js';
import { useMediaLibrary } from './useMediaLibrary.js';

export interface MediaLibraryPageProps {
  api: MediaApi;
  /** The AI assistant, so a picture can get an alt text suggestion. */
  ai?: AiApi;
  onBack?: () => void;
}

/**
 * Full-page media library (docs/design/05-admin-ia.md). It shares its body with
 * the picker dialog, so both stay identical without duplicated markup.
 */
export const MediaLibraryPage = ({ api, ai, onBack }: MediaLibraryPageProps) => {
  const t = useT();
  const library = useMediaLibrary(api);

  return (
    <div className="media-page">
      <header className="media-page__header">
        <div>
          <h1 className="media-page__title">{t('media.title')}</h1>
          <p className="media-page__subtitle">
            {library.loading
              ? t('media.loading')
              : t('media.summary', { count: library.items.length })}
          </p>
        </div>
        {onBack ? (
          <button type="button" className="media-page__back" onClick={onBack}>
            {t('media.backToEditor')}
          </button>
        ) : null}
      </header>

      <MediaLibraryBody
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
        onRetry={() => void library.reload()}
        {...(ai ? { ai } : {})}
      />
    </div>
  );
};

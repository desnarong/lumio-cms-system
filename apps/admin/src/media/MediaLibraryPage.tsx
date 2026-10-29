import { PageHeader, useT } from '@lumio/ui';
import { MediaLibraryBody } from './MediaLibraryBody.js';
import type { AiApi } from '../ai/api.js';
import type { MediaApi } from './api.js';
import { useMediaLibrary } from './useMediaLibrary.js';

export interface MediaLibraryPageProps {
  api: MediaApi;
  /** The AI assistant, so a picture can get an alt text suggestion. */
  ai?: AiApi;
}

/**
 * Full-page media library (docs/design/05-admin-ia.md). It shares its body with
 * the picker dialog, so both stay identical without duplicated markup.
 */
export const MediaLibraryPage = ({ api, ai }: MediaLibraryPageProps) => {
  const t = useT();
  const library = useMediaLibrary(api);

  return (
    <div className="media-page">
      <PageHeader
        eyebrow={t('nav.section.work')}
        title={t('media.title')}
        description={
          library.loading ? t('media.loading') : t('media.summary', { count: library.items.length })
        }
      />

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

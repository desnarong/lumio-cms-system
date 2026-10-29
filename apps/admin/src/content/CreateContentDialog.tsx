import { useEffect, useState } from 'react';
import { useMediaPicker, type PickedImage } from '@lumio/blocks';
import type { ContentType } from '@lumio/shared';
import { Button, ImagePicker, Modal, TextField, useT } from '@lumio/ui';
import { suggestSlug } from './create-slug.js';

export interface CreateContentInput {
  title: string;
  slug: string;
  /** Cover image for a post; a page has no cover. */
  coverMediaId?: string;
}

export interface CreateContentDialogProps {
  open: boolean;
  kind: ContentType;
  creating: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: CreateContentInput) => void;
}

/**
 * Asks for a name and a link before creating a page or a post, because the editor
 * itself has no rename field yet. The link follows the name until the user edits
 * it (docs/design/04-ux.md 4.5: "ชื่อลิงก์", never "slug"). A post also picks its
 * cover here, since that is the image the blog list shows.
 */
export const CreateContentDialog = ({
  open,
  kind,
  creating,
  error,
  onCancel,
  onSubmit,
}: CreateContentDialogProps) => {
  const t = useT();
  const picker = useMediaPicker();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [cover, setCover] = useState<PickedImage | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSlug('');
      setSlugTouched(false);
      setCover(null);
    }
  }, [open]);

  const onTitleChange = (value: string): void => {
    setTitle(value);
    if (!slugTouched) setSlug(suggestSlug(value, kind));
  };

  const canSubmit = title.trim().length > 0 && slug.trim().length > 0 && !creating;

  return (
    <Modal
      open={open}
      title={t(kind === 'page' ? 'content.newPageTitle' : 'content.newPostTitle')}
      description={t('content.newDescription')}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={creating}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                slug: slug.trim(),
                ...(cover?.mediaId ? { coverMediaId: cover.mediaId } : {}),
              })
            }
          >
            {creating ? t('common.loading') : t('content.createAndEdit')}
          </Button>
        </>
      }
    >
      <div className="create-dialog">
        <TextField
          label={t(kind === 'page' ? 'content.titleLabelPage' : 'content.titleLabelPost')}
          value={title}
          autoFocus
          placeholder={t(
            kind === 'page' ? 'content.titlePlaceholderPage' : 'content.titlePlaceholderPost',
          )}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <TextField
          label={t('content.slugLabel')}
          value={slug}
          hint={t('content.slugHint')}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
        {kind === 'post' ? (
          <ImagePicker
            label={t('content.coverLabel')}
            hint={t('content.coverHint')}
            aspect="wide"
            value={cover?.url ?? null}
            alt={cover?.alt ?? title}
            {...(picker
              ? {
                  onPick: () => {
                    void picker.pick({ aspect: 'wide' }).then((picked) => {
                      if (picked) setCover(picked);
                    });
                  },
                }
              : {})}
            onChange={() => setCover(null)}
          />
        ) : null}
        {error ? (
          <p className="create-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};

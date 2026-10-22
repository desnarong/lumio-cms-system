import { useEffect, useState } from 'react';
import { slugify, type ContentType } from '@lumio/shared';
import { Button, Modal, TextField, useT } from '@lumio/ui';

export interface CreateContentInput {
  title: string;
  slug: string;
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
 * it (docs/design/04-ux.md 4.5: "ชื่อลิงก์", never "slug").
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
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSlug('');
      setSlugTouched(false);
    }
  }, [open]);

  const onTitleChange = (value: string): void => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value, ''));
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
            onClick={() => onSubmit({ title: title.trim(), slug: slug.trim() })}
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
        {error ? (
          <p className="create-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};

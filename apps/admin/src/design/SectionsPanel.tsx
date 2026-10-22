import { useState } from 'react';
import type { SectionTemplate } from '@lumio/shared';
import { Button, Card, EmptyState, Skeleton, TextField, useT, useToast } from '@lumio/ui';
import type { DesignApi } from './api.js';
import { useSections } from './hooks.js';

const SectionRow = ({
  section,
  onRename,
  onRemove,
}: {
  section: SectionTemplate;
  onRename: (name: string) => void;
  onRemove: () => void;
}) => {
  const t = useT();
  const [name, setName] = useState(section.name);
  const dirty = name.trim().length > 0 && name.trim() !== section.name;

  return (
    <Card className="section-row">
      <TextField
        label={t('sections.nameLabel')}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <p className="section-row__meta">
        {t('sections.meta', {
          count: section.blocks.length,
          date: section.createdAt.slice(0, 10),
        })}
      </p>
      <div className="section-row__actions">
        <Button
          variant="secondary"
          size="sm"
          disabled={!dirty}
          onClick={() => onRename(name.trim())}
        >
          {t('sections.saveName')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          {t('common.delete')}
        </Button>
      </div>
    </Card>
  );
};

/**
 * Saved sections tab: sections the owner saved from the editor
 * (docs/design/07-blocks.md 7.2). Renaming and deleting live here; deleting offers
 * an undo that re-creates the section.
 */
export const SectionsPanel = ({ api }: { api: DesignApi }) => {
  const t = useT();
  const sections = useSections(api);
  const toast = useToast();

  if (sections.loading) {
    return (
      <div className="design-panel" aria-busy="true">
        <Skeleton shape="block" height={120} />
        <Skeleton shape="block" height={120} />
      </div>
    );
  }

  const remove = async (section: SectionTemplate): Promise<void> => {
    await sections.remove(section);
    toast.push({
      tone: 'success',
      title: t('sections.deleted'),
      undo: {
        label: t('common.undo'),
        onClick: () => {
          void api
            .createSection({ name: section.name, blocks: section.blocks })
            .then(() => sections.reload())
            .catch(() => undefined);
        },
      },
    });
  };

  return (
    <div className="design-panel">
      <p className="design-hint">{t('sections.hint')}</p>

      {sections.error ? (
        <p className="design-error" role="alert">
          {sections.error}
        </p>
      ) : null}

      {sections.sections.length === 0 ? (
        <EmptyState
          illustration={<span aria-hidden="true">🧩</span>}
          title={t('sections.empty')}
          description={t('sections.emptyHint')}
        />
      ) : (
        <div className="section-list">
          {sections.sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              onRename={(name) => void sections.rename(section.id, name)}
              onRemove={() => void remove(section)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

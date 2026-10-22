import { useState } from 'react';
import type { AiProposal, SeoMetaCandidate } from '@lumio/shared';
import { Button, Card, useT, useToast } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import { AiDiffDialog } from '../ai/AiDiffDialog.js';
import type { SeoApi, SeoMetaInput } from './api.js';

export interface SeoMetaAssistantProps {
  api: SeoApi;
  /** Pages the report says are still missing meta text. */
  candidates: SeoMetaCandidate[];
  /** Writing meta needs a content-write role. */
  canManage: boolean;
  /** Reloads the report after a save or an undo. */
  onApplied: () => void | Promise<void>;
}

/** Reads the two meta texts out of the assistant's proposal. */
export const seoMetaFromProposal = (proposal: AiProposal): SeoMetaInput => ({
  title: proposal.changes.find((change) => change.field === 'title')?.after ?? '',
  description: proposal.changes.find((change) => change.field === 'description')?.after ?? '',
});

/**
 * Drafts the search title and description of a page that has none, right from the
 * SEO report (docs/design/09-ai-assistant.md 9.2). The suggestion always shows as
 * a diff first, and saving it offers an undo in the toast.
 */
export const SeoMetaAssistant = ({
  api,
  candidates,
  canManage,
  onApplied,
}: SeoMetaAssistantProps) => {
  const t = useT();
  const { push } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = async (pageId: string): Promise<void> => {
    setBusyId(pageId);
    setError(null);
    try {
      setProposal(await api.suggestMeta(pageId));
      setPendingId(pageId);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t('seo.meta.failed'));
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (): Promise<void> => {
    if (!proposal || !pendingId) return;

    const pageId = pendingId;
    setSaving(true);
    try {
      const saved = await api.saveMeta(pageId, seoMetaFromProposal(proposal));
      await onApplied();
      push({
        title: t('seo.meta.applied'),
        tone: 'success',
        undo: {
          onClick: () => {
            void api.saveMeta(pageId, saved.previous).then(onApplied);
          },
        },
      });
      setProposal(null);
      setPendingId(null);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t('seo.meta.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="seo-meta">
      <h2 className="growth__card-title">{t('seo.meta.title')}</h2>
      <p className="seo-meta__hint">{t('seo.meta.hint')}</p>

      {error ? (
        <p className="growth__inline-error" role="alert">
          {error}
        </p>
      ) : null}

      {candidates.length === 0 ? (
        <p className="seo-meta__empty">{t('seo.meta.empty')}</p>
      ) : (
        <ul className="seo-meta__list">
          {candidates.map((candidate) => (
            <li className="seo-meta__row" key={candidate.id}>
              <div className="seo-meta__body">
                <p className="seo-meta__page">{candidate.title}</p>
                <p className="seo-meta__missing">
                  {[
                    candidate.missingTitle ? t('seo.meta.missingTitle') : null,
                    candidate.missingDescription ? t('seo.meta.missingDescription') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId !== null || saving}
                  onClick={() => void suggest(candidate.id)}
                >
                  {busyId === candidate.id ? t('seo.meta.asking') : t('seo.meta.ask')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!canManage && candidates.length > 0 ? (
        <p className="seo-meta__hint">{t('seo.meta.readOnly')}</p>
      ) : null}

      <AiDiffDialog
        proposal={proposal}
        busy={saving}
        onAccept={() => void accept()}
        onReject={() => {
          setProposal(null);
          setPendingId(null);
        }}
      />
    </Card>
  );
};

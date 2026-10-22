import type { AiProposal, AiSiteCommandProposal } from '@lumio/shared';
import { Button, Modal, useT } from '@lumio/ui';
import { aiProviderLabel } from './api.js';

/** A suggestion is either a text change or a whole-site design change. */
export type AiDiffProposal = AiProposal | AiSiteCommandProposal;

export interface AiDiffDialogProps {
  /** The suggestion being reviewed; nothing renders without one. */
  proposal: AiDiffProposal | null;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * The diff the assistant proposes (docs/design/09-ai-assistant.md 9.2). It shows
 * every change as before/after and only the user's "นำไปใช้" applies it, so the
 * AI can never edit the site by itself.
 */
export const AiDiffDialog = ({ proposal, busy = false, onAccept, onReject }: AiDiffDialogProps) => {
  const t = useT();
  if (!proposal) return null;

  return (
    <Modal
      open
      size="md"
      title={t('ai.diff.title', { label: proposal.label })}
      description={proposal.summary}
      onClose={onReject}
      footer={
        <div className="ai-diff__actions">
          <Button variant="ghost" onClick={onReject} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onAccept} disabled={busy}>
            {busy ? t('ai.diff.pending') : t('ai.diff.apply')}
          </Button>
        </div>
      }
    >
      <ul className="ai-diff" aria-label={t('ai.diff.changesLabel')}>
        {proposal.changes.map((change, index) => (
          <li className="ai-diff__row" key={`${change.field}-${index}`}>
            <p className="ai-diff__label">{change.label}</p>
            {change.before.trim().length > 0 ? (
              <p className="ai-diff__before">
                <span aria-hidden="true">−</span> {change.before}
              </p>
            ) : null}
            <p className="ai-diff__after">
              <span aria-hidden="true">+</span> {change.after}
            </p>
          </li>
        ))}
      </ul>
      <p className="ai-diff__note">
        {t('ai.diff.note', { provider: aiProviderLabel(proposal.provider) })}
      </p>
    </Modal>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AI_REWRITE_STYLES,
  isAiQuotaExhausted,
  type AiProposal,
  type AiRewriteStyle,
  type AiSiteCommandProposal,
  type AiStatus,
  type AiUsage,
} from '@lumio/shared';
import { Button, Icon, Select, Skeleton, TextField, useT, type MessageKey } from '@lumio/ui';
import { aiProviderLabel, type AiApi } from './api.js';
import { AiDiffDialog, type AiDiffProposal } from './AiDiffDialog.js';

/** One text the editor found on the page, with the path that writes it back. */
export interface AiField {
  path: string;
  label: string;
  value: string;
}

const STYLE_LABEL_KEYS: Record<AiRewriteStyle, MessageKey> = {
  shorter: 'ai.style.shorter',
  formal: 'ai.style.formal',
  friendly: 'ai.style.friendly',
  expanded: 'ai.style.expanded',
  clearer: 'ai.style.clearer',
};

export interface AiAssistantProps {
  api: AiApi;
  /** The page being edited, for the SEO suggestion. */
  pageId: string;
  /** Text fields of the selected block, read from the rendered page. */
  fields: AiField[];
  onApplyText: (changes: { path: string; after: string }[]) => void;
  onApplySeo: (seo: { title: string; description: string }) => void;
  /** Applies a whole-site design-token patch; omit to hide the command box. */
  onApplyTheme?: (proposal: AiSiteCommandProposal) => Promise<boolean>;
  onError: (message: string) => void;
}

/**
 * The assistant inside the editor (docs/design/09-ai-assistant.md 9.3). It rewrites
 * or translates the text of the selected block, drafts a page title and description,
 * and always shows the result as a diff the user accepts or rejects. Applying goes
 * through the normal editor history, so Ctrl+Z and the toast undo both work.
 */
export const AiAssistant = ({
  api,
  pageId,
  fields,
  onApplyText,
  onApplySeo,
  onApplyTheme,
  onError,
}: AiAssistantProps) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [style, setStyle] = useState<AiRewriteStyle>('shorter');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<AiDiffProposal | null>(null);
  const [pending, setPending] = useState<'text' | 'seo' | 'theme' | 'block' | null>(null);
  const [instruction, setInstruction] = useState('');
  const [commandBusy, setCommandBusy] = useState(false);

  // The toast object changes identity on every render, so the callbacks read the
  // latest handler from a ref instead of re-subscribing to it.
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const quotaLabel = (usage: AiUsage): string =>
    usage.limit === null
      ? t('ai.quotaUnlimited')
      : t('ai.quota', { used: usage.used, limit: usage.limit });

  useEffect(() => {
    setSelected(fields.map((field) => field.path));
  }, [fields]);

  useEffect(() => {
    let active = true;
    setLoadingStatus(true);
    void api
      .status()
      .then((loaded) => {
        if (active) setStatus(loaded);
      })
      .catch((error: unknown) => {
        if (active) {
          errorRef.current(error instanceof Error ? error.message : t('ai.panel.loadError'));
        }
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  const chosen = fields.filter((field) => selected.includes(field.path));

  const ask = useCallback(
    async (kind: 'text' | 'seo', run: () => Promise<{ proposal: AiProposal }>) => {
      if (kind === 'text' && chosen.length === 0) {
        errorRef.current(t('ai.panel.pickFirst'));
        return;
      }
      setBusy(true);
      try {
        const result = await run();
        setProposal(result.proposal);
        setPending(kind);
        const refreshed = await api.status().catch(() => null);
        if (refreshed) setStatus(refreshed);
      } catch (error) {
        errorRef.current(error instanceof Error ? error.message : t('ai.panel.failed'));
      } finally {
        setBusy(false);
      }
    },
    [api, chosen.length, t],
  );

  /** "แก้ข้อความที่เลือกให้สั้นลง": edits the selected block from one sentence. */
  const runBlockCommand = async (): Promise<void> => {
    if (fields.length === 0 || instruction.trim().length < 3) return;
    setCommandBusy(true);
    try {
      const result = await api.blockCommand({
        pageId,
        instruction: instruction.trim(),
        texts: fields.map((field) => ({
          path: field.path,
          label: field.label,
          value: field.value,
        })),
      });
      setProposal(result.proposal);
      setPending('block');
      const refreshed = await api.status().catch(() => null);
      if (refreshed) setStatus(refreshed);
    } catch (error) {
      errorRef.current(error instanceof Error ? error.message : t('ai.chat.unclear'));
    } finally {
      setCommandBusy(false);
    }
  };

  const runCommand = async (): Promise<void> => {
    if (!onApplyTheme || instruction.trim().length < 3) return;
    setCommandBusy(true);
    try {
      const result = await api.siteCommand({ instruction: instruction.trim() });
      setProposal(result.proposal);
      setPending('theme');
      const refreshed = await api.status().catch(() => null);
      if (refreshed) setStatus(refreshed);
    } catch (error) {
      errorRef.current(error instanceof Error ? error.message : t('ai.chat.unclear'));
    } finally {
      setCommandBusy(false);
    }
  };

  const accept = async (): Promise<void> => {
    if (!proposal || !pending) return;

    if (pending === 'theme') {
      if (!onApplyTheme) return;
      setBusy(true);
      const applied = await onApplyTheme(proposal as AiSiteCommandProposal);
      setBusy(false);
      if (!applied) return;
    } else if (pending === 'block') {
      onApplyText(
        proposal.changes
          .map((change) => ({
            path: 'path' in change ? (change.path ?? '') : '',
            after: change.after,
          }))
          .filter((change) => change.path.length > 0),
      );
    } else if (pending === 'seo') {
      const title = proposal.changes.find((change) => change.field === 'title')?.after ?? '';
      const description =
        proposal.changes.find((change) => change.field === 'description')?.after ?? '';
      onApplySeo({ title, description });
    } else {
      onApplyText(
        proposal.changes
          .map((change, index) => ({ path: chosen[index]?.path ?? '', after: change.after }))
          .filter((change) => change.path.length > 0),
      );
    }

    setProposal(null);
    setPending(null);
  };

  if (loadingStatus && !status) {
    return (
      <section className="ai-panel" aria-label={t('ai.panel.title')} aria-busy="true">
        <p className="ai-panel__title">
          <Icon name="sparkles" size={16} />
          {t('ai.panel.title')}
        </p>
        <Skeleton shape="text" lines={2} />
      </section>
    );
  }

  const enabled = status?.enabled ?? false;
  const exhausted = status ? isAiQuotaExhausted(status.usage) : false;

  const styleOptions = AI_REWRITE_STYLES.map((value) => ({
    value,
    label: t(STYLE_LABEL_KEYS[value]),
  }));

  return (
    <section className="ai-panel" aria-label={t('ai.panel.title')}>
      <button
        type="button"
        className="ai-panel__toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ai-panel__title">
          <Icon name="sparkles" size={16} />
          {t('ai.panel.title')}
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />
      </button>
      <div className="ai-panel__content" hidden={!open}>
      <p className="ai-panel__hint">
        {status
          ? `${quotaLabel(status.usage)} · ${aiProviderLabel(status.provider)}`
          : t('ai.panel.checking')}
      </p>

      {enabled ? (
        <>
          {fields.length === 0 ? (
            <p className="ai-panel__hint">{t('ai.panel.pickBlock')}</p>
          ) : (
            <ul className="ai-panel__fields" aria-label={t('ai.panel.fieldsLabel')}>
              {fields.map((field) => (
                <li className="ai-panel__field" key={field.path}>
                  <label className="ai-panel__field-label">
                    <input
                      type="checkbox"
                      checked={selected.includes(field.path)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, field.path]
                            : current.filter((path) => path !== field.path),
                        )
                      }
                    />
                    <span>{field.label}</span>
                  </label>
                  <p className="ai-panel__field-value">{field.value}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="ai-panel__row">
            <Select
              label={t('ai.panel.styleLabel')}
              value={style}
              options={styleOptions}
              onChange={(event) => setStyle(event.target.value as AiRewriteStyle)}
            />
          </div>

          <div className="ai-panel__actions">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || exhausted}
              onClick={() =>
                void ask('text', () =>
                  api.rewrite({
                    texts: chosen.map((field) => field.value),
                    style,
                  }),
                )
              }
            >
              {t('ai.panel.rewrite')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || exhausted}
              onClick={() =>
                void ask('text', () =>
                  api.translate({ texts: chosen.map((field) => field.value), targetLocale: 'en' }),
                )
              }
            >
              {t('ai.panel.translateEn')}
            </Button>
          </div>

          <div className="ai-panel__actions">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || exhausted}
              onClick={() => void ask('seo', () => api.seo({ pageId }))}
            >
              {t('ai.panel.seo')}
            </Button>
          </div>

          {onApplyTheme || fields.length > 0 ? (
            <form
              className="ai-panel__command"
              onSubmit={(event) => {
                event.preventDefault();
                void runCommand();
              }}
            >
              <p className="ai-panel__title">{t('ai.chat.title')}</p>
              <p className="ai-panel__hint">
                {fields.length > 0 ? t('ai.chat.blockHint') : t('ai.chat.hint')}
              </p>
              <TextField
                id="ai-site-command"
                label={t('ai.chat.label')}
                placeholder={t('ai.chat.placeholder')}
                value={instruction}
                maxLength={200}
                onChange={(event) => setInstruction(event.target.value)}
              />
              <div className="ai-panel__actions">
                {fields.length > 0 ? (
                  <Button
                    size="sm"
                    type="button"
                    disabled={commandBusy || busy || exhausted || instruction.trim().length < 3}
                    onClick={() => void runBlockCommand()}
                  >
                    {t('ai.chat.blockAction')}
                  </Button>
                ) : null}
                {onApplyTheme ? (
                  <Button
                    size="sm"
                    type="submit"
                    variant={fields.length > 0 ? 'ghost' : 'secondary'}
                    disabled={commandBusy || busy || exhausted || instruction.trim().length < 3}
                  >
                    {t('ai.chat.action')}
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </>
      ) : (
        <p className="ai-panel__hint">{t('ai.panel.notInPlan')}</p>
      )}

      {exhausted ? (
        <p className="ai-panel__hint" role="status">
          {t('ai.panel.exhausted')}
        </p>
      ) : null}

      <AiDiffDialog
        proposal={proposal}
        busy={busy}
        onAccept={() => void accept()}
        onReject={() => {
          setProposal(null);
          setPending(null);
        }}
      />
      </div>
    </section>
  );
};

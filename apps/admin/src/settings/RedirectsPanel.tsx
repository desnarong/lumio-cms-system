import { useEffect, useState } from 'react';
import {
  createRedirectInputSchema,
  type RedirectCode,
  type RedirectRule,
} from '@lumio/shared';
import {
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
  TextField,
  translateNow,
  useT,
  useToast,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { SettingsApi } from './api.js';

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const sortRules = (items: RedirectRule[]): RedirectRule[] =>
  [...items].sort((a, b) => a.fromPath.localeCompare(b.fromPath));

const codeOptions = (permanent: string, temporary: string) => [
  { value: '301', label: permanent },
  { value: '302', label: temporary },
];

export interface RedirectsViewProps {
  items: RedirectRule[];
  fromPath: string;
  toPath: string;
  code: RedirectCode;
  busy: boolean;
  error: string | null;
  onFromPathChange: (value: string) => void;
  onToPathChange: (value: string) => void;
  onCodeChange: (code: RedirectCode) => void;
  onAdd: () => void;
  onSave: (rule: RedirectRule) => Promise<boolean>;
  onRemove: (rule: RedirectRule) => void;
}

const RedirectRow = ({
  rule,
  busy,
  onSave,
  onRemove,
}: {
  rule: RedirectRule;
  busy: boolean;
  onSave: (rule: RedirectRule) => Promise<boolean>;
  onRemove: (rule: RedirectRule) => void;
}) => {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [toPath, setToPath] = useState(rule.toPath);
  const [code, setCode] = useState<RedirectCode>(rule.code);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToPath(rule.toPath);
    setCode(rule.code);
  }, [rule.toPath, rule.code]);

  const save = async (): Promise<void> => {
    try {
      const parsed = createRedirectInputSchema.parse({
        fromPath: rule.fromPath,
        toPath,
        code,
      });
      setError(null);
      if (await onSave({ ...rule, ...parsed })) setEditing(false);
    } catch {
      setError(t('settings.redirects.invalid'));
    }
  };

  return (
    <li className="settings-row">
      {editing ? (
        <div className="settings-inline settings-inline--aligned">
          <TextField
            label={t('settings.redirects.to')}
            hint={t('settings.redirects.toHint')}
            fieldClassName="settings-inline__field"
            value={toPath}
            onChange={(event) => setToPath(event.target.value)}
          />
          <Select
            label={t('settings.redirects.code')}
            fieldClassName="settings-inline__role"
            options={codeOptions(
              t('settings.redirects.permanent'),
              t('settings.redirects.temporary'),
            )}
            value={String(code)}
            onChange={(event) => setCode(event.target.value === '302' ? 302 : 301)}
          />
          {error ? (
            <span className="settings-error" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="settings-row__main">
          <span className="settings-row__title">
            {rule.fromPath} → {rule.toPath}
          </span>
          <span className="settings-row__meta">
            {rule.code === 301
              ? t('settings.redirects.permanent')
              : t('settings.redirects.temporary')}
          </span>
        </div>
      )}
      <div className="settings-row__actions">
        {editing ? (
          <>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              {t('settings.redirects.cancel')}
            </Button>
            <Button size="sm" variant="primary" disabled={busy} onClick={() => void save()}>
              {t('settings.redirects.save')}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {t('settings.redirects.edit')}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRemove(rule)}>
              {t('settings.redirects.remove')}
            </Button>
          </>
        )}
      </div>
    </li>
  );
};

export const RedirectsView = ({
  items,
  fromPath,
  toPath,
  code,
  busy,
  error,
  onFromPathChange,
  onToPathChange,
  onCodeChange,
  onAdd,
  onSave,
  onRemove,
}: RedirectsViewProps) => {
  const t = useT();

  return (
    <div className="settings-panel">
      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.redirects.title')}</h2>
        <p className="settings-card__hint">{t('settings.redirects.hint')}</p>
        <div className="settings-inline settings-inline--aligned">
          <TextField
            label={t('settings.redirects.from')}
            hint={t('settings.redirects.fromHint')}
            fieldClassName="settings-inline__field"
            value={fromPath}
            onChange={(event) => onFromPathChange(event.target.value)}
          />
          <TextField
            label={t('settings.redirects.to')}
            hint={t('settings.redirects.toHint')}
            fieldClassName="settings-inline__field"
            value={toPath}
            onChange={(event) => onToPathChange(event.target.value)}
          />
          <Select
            label={t('settings.redirects.code')}
            fieldClassName="settings-inline__role"
            options={codeOptions(
              t('settings.redirects.permanent'),
              t('settings.redirects.temporary'),
            )}
            value={String(code)}
            onChange={(event) => onCodeChange(event.target.value === '302' ? 302 : 301)}
          />
          <div className="settings-inline__action">
            <Button
              variant="primary"
              disabled={busy || fromPath.trim().length === 0 || toPath.trim().length === 0}
              onClick={onAdd}
            >
              {t('settings.redirects.add')}
            </Button>
          </div>
        </div>
        {error ? (
          <span className="settings-error" role="alert">
            {error}
          </span>
        ) : null}
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title={t('settings.redirects.emptyTitle')}
          description={t('settings.redirects.emptyBody')}
        />
      ) : (
        <ul className="settings-list">
          {items.map((rule) => (
            <RedirectRow
              key={rule.fromPath}
              rule={rule}
              busy={busy}
              onSave={onSave}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export const RedirectsTab = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<RedirectRule[]>([]);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [code, setCode] = useState<RedirectCode>(301);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .listRedirects()
      .then((result) => {
        if (active) setItems(sortRules(result.items));
      })
      .catch((loadError) => {
        if (active) setError(messageOf(loadError, translateNow('common.genericError')));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const add = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const parsed = createRedirectInputSchema.parse({ fromPath, toPath, code });
      const created = await api.createRedirect(parsed);
      setItems((current) => sortRules([...current, created]));
      setFromPath('');
      setToPath('');
      setCode(301);
      toast.push({ tone: 'success', title: t('settings.redirects.added') });
    } catch (addError) {
      setError(messageOf(addError, t('settings.redirects.invalid')));
    } finally {
      setBusy(false);
    }
  };

  const save = async (rule: RedirectRule): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateRedirect({
        fromPath: rule.fromPath,
        toPath: rule.toPath,
        code: rule.code,
      });
      setItems((current) =>
        sortRules(current.map((item) => (item.fromPath === updated.fromPath ? updated : item))),
      );
      toast.push({ tone: 'success', title: t('settings.redirects.saved') });
      return true;
    } catch (saveError) {
      setError(messageOf(saveError, translateNow('common.genericError')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rule: RedirectRule): Promise<void> => {
    const snapshot = items;
    setItems((current) => current.filter((item) => item.fromPath !== rule.fromPath));
    try {
      await api.removeRedirect(rule.fromPath);
      toast.push({
        tone: 'success',
        title: t('settings.redirects.removed'),
        undo: {
          label: t('common.undo'),
          onClick: () => {
            setItems(snapshot);
            void api
              .createRedirect({
                fromPath: rule.fromPath,
                toPath: rule.toPath,
                code: rule.code,
              })
              .catch(() => undefined);
          },
        },
      });
    } catch (removeError) {
      setItems(snapshot);
      toast.push({
        tone: 'danger',
        title: messageOf(removeError, translateNow('common.genericError')),
      });
    }
  };

  if (loading) return <Skeleton shape="block" height={220} />;

  return (
    <RedirectsView
      items={items}
      fromPath={fromPath}
      toPath={toPath}
      code={code}
      busy={busy}
      error={error}
      onFromPathChange={setFromPath}
      onToPathChange={setToPath}
      onCodeChange={setCode}
      onAdd={() => void add()}
      onSave={save}
      onRemove={(rule) => void remove(rule)}
    />
  );
};

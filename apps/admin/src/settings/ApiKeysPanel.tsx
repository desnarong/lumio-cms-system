import { useCallback, useEffect, useState } from 'react';
import type { ApiKey, ApiKeyCreated, ApiKeyScope } from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  Modal,
  Skeleton,
  TextField,
  useT,
  useToast,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { ApiKeysApi } from './api-keys.js';

export interface ApiKeysPanelProps {
  api: ApiKeysApi;
  /** Only owners and admins may create or revoke a key. */
  canManage: boolean;
  demo?: boolean;
}

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const day = (iso: string | null, never: string): string =>
  iso ? iso.slice(0, 16).replace('T', ' ') : never;

/**
 * "ตั้งค่า › กุญแจ API" (docs/PROGRESS.md "งานนอก MVP"). A key is shown exactly
 * once, so the create flow ends in a dialog the owner must read before closing.
 */
export const ApiKeysPanel = ({ api, canManage, demo = false }: ApiKeysPanelProps) => {
  const t = useT();
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.list());
    } catch (loadError) {
      setError(messageOf(loadError, t('apiKeys.loadError')));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (): Promise<void> => {
    if (name.trim().length === 0) {
      setError(t('apiKeys.nameRequired'));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const scopes: ApiKeyScope[] = ['content:read'];
      const key = await api.create({ name: name.trim(), scopes });
      setKeys((current) => [key, ...current]);
      setCreated(key);
      setName('');
    } catch (createError) {
      setError(messageOf(createError, t('common.genericError')));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (key: ApiKey): Promise<void> => {
    setBusy(true);
    try {
      const revoked = await api.revoke(key.id);
      setKeys((current) => current.map((entry) => (entry.id === revoked.id ? revoked : entry)));
      toast.push({ tone: 'success', title: t('apiKeys.revoked'), description: key.name });
    } catch (revokeError) {
      toast.push({ tone: 'danger', title: messageOf(revokeError, t('common.genericError')) });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (secret: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="settings-panel">
      {demo ? <Banner tone="info" title={t('apiKeys.demoHint')} /> : null}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('apiKeys.title')}</h2>
        <p className="settings-card__hint">{t('apiKeys.subtitle')}</p>

        {canManage ? (
          <div className="settings-actions">
            <TextField
              label={t('apiKeys.name')}
              hint={t('apiKeys.nameHint')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        ) : null}
        <p className="settings-hint">
          {t('apiKeys.scopes')}: {t('apiKeys.scope.contentRead')}
        </p>
        {canManage ? (
          <div className="settings-actions">
            <Button variant="primary" disabled={creating} onClick={() => void create()}>
              {creating ? t('apiKeys.creating') : t('apiKeys.create')}
            </Button>
            {error ? (
              <span className="settings-error" role="alert">
                {error}
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="settings-card">
        {loading ? (
          <Skeleton shape="block" height={140} />
        ) : keys.length === 0 ? (
          <EmptyState
            illustration={<Icon name="zap" size={32} />}
            title={t('apiKeys.empty')}
            description={t('apiKeys.emptyHint')}
          />
        ) : (
          <ul className="settings-list">
            {keys.map((key) => {
              const revoked = key.revokedAt !== null;
              return (
                <li key={key.id} className="settings-row">
                  <div className="settings-row__main">
                    <span className="settings-row__title">{key.name}</span>
                    <span className="settings-row__meta">
                      {t('apiKeys.hint')}: {key.hint}… · {t('apiKeys.lastUsed')}:{' '}
                      {day(key.lastUsedAt, t('apiKeys.neverUsed'))} ·{' '}
                      {key.scopes.map(() => t('apiKeys.scope.contentRead')).join(', ')}
                      {revoked ? ` · ${t('apiKeys.revoked')}` : ''}
                    </span>
                  </div>
                  {canManage && !revoked ? (
                    <div className="settings-row__actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPendingRevoke(key)}
                      >
                        {t('apiKeys.revoke')}
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={created !== null}
        size="sm"
        title={t('apiKeys.secretTitle')}
        description={t('apiKeys.secretHint')}
        onClose={() => {
          setCreated(null);
          setCopied(false);
        }}
        footer={
          <div className="settings-actions">
            <Button
              variant="secondary"
              onClick={() => {
                if (created) void copy(created.secret);
              }}
            >
              {copied ? t('apiKeys.copied') : t('apiKeys.copy')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCreated(null);
                setCopied(false);
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        }
      >
        <code className="api-key-secret">{created?.secret}</code>
      </Modal>

      <Modal
        open={pendingRevoke !== null}
        size="sm"
        title={t('apiKeys.revokeTitle')}
        description={
          pendingRevoke ? t('apiKeys.revokeBody', { name: pendingRevoke.name }) : undefined
        }
        onClose={() => setPendingRevoke(null)}
        footer={
          <div className="settings-actions">
            <Button variant="ghost" onClick={() => setPendingRevoke(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = pendingRevoke;
                setPendingRevoke(null);
                if (target) void revoke(target);
              }}
            >
              {t('apiKeys.revoke')}
            </Button>
          </div>
        }
      />
    </div>
  );
};

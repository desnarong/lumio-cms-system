import { useEffect, useState } from 'react';
import {
  PUBLISH_TARGET_MS,
  type PublishSettingsInput,
  type PublishSettingsView as PublishSettingsViewData,
} from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Switch,
  TextField,
  translateNow,
  useT,
  useToast,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { SettingsApi } from './api.js';

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

export interface PublishViewProps {
  settings: PublishSettingsViewData;
  draft: PublishSettingsInput;
  staticSecret: string;
  purgeSecret: string;
  saving: boolean;
  testing: boolean;
  error: string | null;
  testMessage: string | null;
  onDraftChange: (draft: PublishSettingsInput) => void;
  onStaticSecretChange: (value: string) => void;
  onPurgeSecretChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
}

/**
 * ตั้งค่า › การเผยแพร่ (docs/design/03-scope.md "Publish แล้วได้ static HTML บน
 * CDN"). The owner connects their own static host and CDN here; every value is
 * stored per site, so publishing never needs a server-side `.env` edit.
 */
export const PublishView = ({
  settings,
  draft,
  staticSecret,
  purgeSecret,
  saving,
  testing,
  error,
  testMessage,
  onDraftChange,
  onStaticSecretChange,
  onPurgeSecretChange,
  onSave,
  onTest,
}: PublishViewProps) => {
  const t = useT();
  const lastRun = settings.lastRun;
  const seconds = lastRun ? (lastRun.durationMs / 1000).toFixed(1) : null;

  return (
    <div className="settings-panel">
      {settings.staticReady ? (
        <Banner tone="success" title={t('settings.publish.ready')}>
          {t('settings.publish.readyBody')}
        </Banner>
      ) : (
        <Banner tone="warning" title={t('settings.publish.notReady')}>
          {t('settings.publish.notReadyBody')}
        </Banner>
      )}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.publish.title')}</h2>
        <p className="settings-card__hint">{t('settings.publish.hint')}</p>

        <TextField
          label={t('settings.publish.rendererUrl')}
          hint={t('settings.publish.rendererHint')}
          placeholder="https://renderer.yourbrand.com"
          value={draft.rendererUrl}
          onChange={(event) => onDraftChange({ ...draft, rendererUrl: event.target.value })}
        />
        <TextField
          label={t('settings.publish.staticUrl')}
          hint={t('settings.publish.staticHint')}
          placeholder="https://cdn.yourbrand.com/upload"
          value={draft.staticPublishUrl}
          onChange={(event) => onDraftChange({ ...draft, staticPublishUrl: event.target.value })}
        />
        <TextField
          label={t('settings.publish.staticSecret')}
          type="password"
          hint={
            settings.hasStaticPublishSecret
              ? t('settings.publish.secretSaved')
              : t('settings.publish.staticHint')
          }
          placeholder={settings.hasStaticPublishSecret ? '••••••••' : ''}
          disabled={draft.clearStaticPublishSecret === true}
          value={staticSecret}
          onChange={(event) => onStaticSecretChange(event.target.value)}
        />
        {settings.hasStaticPublishSecret ? (
          <Switch
            label={t('settings.publish.clearSecret')}
            checked={draft.clearStaticPublishSecret === true}
            onChange={(clearStaticPublishSecret) =>
              onDraftChange({ ...draft, clearStaticPublishSecret })
            }
          />
        ) : null}

        <TextField
          label={t('settings.publish.purgeUrl')}
          hint={t('settings.publish.purgeHint')}
          placeholder="https://cdn.yourbrand.com/purge"
          value={draft.cdnPurgeUrl}
          onChange={(event) => onDraftChange({ ...draft, cdnPurgeUrl: event.target.value })}
        />
        <TextField
          label={t('settings.publish.purgeSecret')}
          type="password"
          hint={
            settings.hasCdnPurgeSecret
              ? t('settings.publish.secretSaved')
              : t('settings.publish.purgeHint')
          }
          placeholder={settings.hasCdnPurgeSecret ? '••••••••' : ''}
          disabled={draft.clearCdnPurgeSecret === true}
          value={purgeSecret}
          onChange={(event) => onPurgeSecretChange(event.target.value)}
        />
        {settings.hasCdnPurgeSecret ? (
          <Switch
            label={t('settings.publish.clearSecret')}
            checked={draft.clearCdnPurgeSecret === true}
            onChange={(clearCdnPurgeSecret) => onDraftChange({ ...draft, clearCdnPurgeSecret })}
          />
        ) : null}
        <Switch
          label={t('settings.publish.purgeOnPublish')}
          description={t('settings.publish.purgeOnPublishHint')}
          checked={draft.purgeOnPublish}
          onChange={(purgeOnPublish) => onDraftChange({ ...draft, purgeOnPublish })}
        />

        {error ? (
          <p className="settings-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="settings-actions">
          <Button variant="primary" disabled={saving} onClick={onSave}>
            {saving ? t('settings.saving') : t('common.save')}
          </Button>
        </div>
      </Card>

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.publish.testTitle')}</h2>
        <p className="settings-card__hint">{t('settings.publish.testHint')}</p>
        <div className="settings-inline">
          <Button
            variant="secondary"
            disabled={testing || draft.staticPublishUrl.trim().length === 0}
            onClick={onTest}
          >
            {testing ? t('settings.publish.testing') : t('settings.publish.test')}
          </Button>
          <span className="settings-hint">{t('settings.publish.target')}</span>
        </div>
        {testMessage ? (
          <p className="settings-hint" role="status">
            {testMessage}
          </p>
        ) : null}
        {lastRun ? (
          <div className="settings-hint">
            <p>{t('settings.publish.lastRun', { seconds: seconds ?? '0' })}</p>
            {lastRun.durationMs > PUBLISH_TARGET_MS ? (
              <p className="settings-error">{t('settings.publish.lastRunSlow')}</p>
            ) : null}
            {lastRun.failures.length > 0 ? (
              <p className="settings-error">
                {t('settings.publish.lastRunFailed', { paths: lastRun.failures.join(', ') })}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="settings-hint">{t('settings.publish.lastRunNone')}</p>
        )}
      </Card>
    </div>
  );
};

const draftFrom = (settings: PublishSettingsViewData): PublishSettingsInput => ({
  rendererUrl: settings.rendererUrl,
  staticPublishUrl: settings.staticPublishUrl,
  cdnPurgeUrl: settings.cdnPurgeUrl,
  purgeOnPublish: settings.purgeOnPublish,
});

export const PublishPanel = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [settings, setSettings] = useState<PublishSettingsViewData | null>(null);
  const [draft, setDraft] = useState<PublishSettingsInput | null>(null);
  const [staticSecret, setStaticSecret] = useState('');
  const [purgeSecret, setPurgeSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .getPublishSettings()
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setDraft(draftFrom(loaded));
      })
      .catch((loadError) => {
        if (active) setError(messageOf(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  if (loading) return <Skeleton shape="block" height={240} />;
  if (!settings || !draft) {
    return (
      <EmptyState
        tone="error"
        title={t('settings.loadSiteError')}
        description={error ?? t('common.genericError')}
      />
    );
  }

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updatePublishSettings({
        ...draft,
        ...(staticSecret.length > 0 ? { staticPublishSecret: staticSecret } : {}),
        ...(purgeSecret.length > 0 ? { cdnPurgeSecret: purgeSecret } : {}),
      });
      setSettings(updated);
      setDraft(draftFrom(updated));
      setStaticSecret('');
      setPurgeSecret('');
      toast.push({ tone: 'success', title: t('settings.saved') });
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const test = async (): Promise<void> => {
    setTesting(true);
    setTestMessage(null);
    try {
      const result = await api.testPublish();
      setTestMessage(result.message);
      toast.push({
        tone: result.ok ? 'success' : 'warning',
        title: result.message,
      });
    } catch (testError) {
      setTestMessage(messageOf(testError));
    } finally {
      setTesting(false);
    }
  };

  return (
    <PublishView
      settings={settings}
      draft={draft}
      staticSecret={staticSecret}
      purgeSecret={purgeSecret}
      saving={saving}
      testing={testing}
      error={error}
      testMessage={testMessage}
      onDraftChange={setDraft}
      onStaticSecretChange={setStaticSecret}
      onPurgeSecretChange={setPurgeSecret}
      onSave={() => void save()}
      onTest={() => void test()}
    />
  );
};

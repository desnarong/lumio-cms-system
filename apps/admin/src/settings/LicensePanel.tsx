import { useCallback, useEffect, useState } from 'react';
import type { LicenseFeature, LicenseReason, LicenseView } from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Textarea,
  useT,
  useToast,
  type MessageKey,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { LicenseApi } from './license.js';

export interface LicensePanelProps {
  api: LicenseApi;
  /** Only an owner may swap the licence of the installation. */
  canManage: boolean;
  demo?: boolean;
}

const FEATURE_KEYS: Record<LicenseFeature, MessageKey> = {
  membership: 'license.feature.membership',
  marketplace: 'license.feature.marketplace',
  whitelabel: 'license.feature.whitelabel',
};

const REASON_KEYS: Partial<Record<LicenseReason, MessageKey>> = {
  expired: 'license.reason.expired',
  bad_signature: 'license.reason.badSignature',
  malformed: 'license.reason.malformed',
  no_public_key: 'license.reason.noKey',
  not_activated: 'license.reason.notActivated',
  wrong_install: 'license.reason.wrongInstall',
};

const SOURCE_KEYS: Record<LicenseView['source'], MessageKey> = {
  env: 'license.source.env',
  database: 'license.source.database',
  none: 'license.source.none',
};

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

export interface LicenseDetailsProps {
  view: LicenseView;
  canManage: boolean;
  demo?: boolean;
  token: string;
  busy: 'install' | 'remove' | 'refresh' | null;
  error: string | null;
  onTokenChange: (value: string) => void;
  onInstall: () => void;
  onRemove: () => void;
  onRefresh: () => void;
}

/**
 * "ตั้งค่า › ไลเซนส์" (docs/design/24-community-licensing.md 24.10).
 *
 * The owner pastes the token they were sold and the API stores it in the
 * database, so nobody has to edit `.env` on the server. `LUMIO_LICENSE` still
 * wins when a deployment pins one from its config; the screen says so instead of
 * pretending the stored licence is the one in force.
 */
export const LicenseDetails = ({
  view,
  canManage,
  demo = false,
  token,
  busy,
  error,
  onTokenChange,
  onInstall,
  onRemove,
  onRefresh,
}: LicenseDetailsProps) => {
  const t = useT();
  const reasonKey = view.valid ? undefined : REASON_KEYS[view.reason];
  const fromEnv = view.source === 'env';

  return (
    <div className="settings-panel">
      {reasonKey && view.source !== 'none' ? (
        <Banner tone="warning" title={t('license.problemTitle')}>
          {t(reasonKey)}
        </Banner>
      ) : null}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('license.current')}</h2>
        <p className="settings-card__hint">{t('license.subtitle')}</p>

        <dl className="license-facts">
          <div className="license-fact">
            <dt>{t('license.edition')}</dt>
            <dd className={view.valid ? 'license-badge license-badge--pro' : 'license-badge'}>
              {view.valid ? t('license.editionPro') : t('license.editionCommunity')}
            </dd>
          </div>
          {view.valid ? (
            <div className="license-fact">
              <dt>{t('license.plan')}</dt>
              <dd>{t(view.plan === 'business' ? 'license.planBusiness' : 'license.planPro')}</dd>
            </div>
          ) : null}
          {view.subject ? (
            <div className="license-fact">
              <dt>{t('license.subject')}</dt>
              <dd>{view.subject}</dd>
            </div>
          ) : null}
          <div className="license-fact">
            <dt>{t('license.expires')}</dt>
            <dd>
              {view.expiresAt
                ? new Date(view.expiresAt).toLocaleDateString('th-TH', { dateStyle: 'long' })
                : t('license.perpetual')}
            </dd>
          </div>
          <div className="license-fact">
            <dt>{t('license.mode')}</dt>
            <dd>{t(view.mode === 'online' ? 'license.modeOnline' : 'license.modeOffline')}</dd>
          </div>
          <div className="license-fact">
            <dt>{t('license.source')}</dt>
            <dd>{t(SOURCE_KEYS[view.source])}</dd>
          </div>
        </dl>

        {view.features.length > 0 ? (
          <ul className="license-chips">
            {view.features.map((feature) => (
              <li className="license-chip" key={feature}>
                {t(FEATURE_KEYS[feature])}
              </li>
            ))}
          </ul>
        ) : null}

        {fromEnv ? (
          <Banner tone="info" title={t('license.envTitle')}>
            {t('license.envBody')}
          </Banner>
        ) : null}

        {error ? (
          <p className="settings-error" role="alert">
            {error}
          </p>
        ) : null}

        {view.mode === 'online' && canManage ? (
          <div className="settings-actions">
            <Button variant="secondary" disabled={busy !== null} onClick={onRefresh}>
              {busy === 'refresh' ? t('license.refreshing') : t('license.refresh')}
            </Button>
          </div>
        ) : null}
      </Card>

      {canManage && !fromEnv ? (
        <Card className="settings-card">
          <h2 className="settings-card__title">{t('license.installTitle')}</h2>
          <p className="settings-card__hint">{t('license.installHint')}</p>
          {demo ? <p className="settings-hint">{t('license.demoHint')}</p> : null}
          <Textarea
            label={t('license.tokenLabel')}
            hint={t('license.tokenHint')}
            value={token}
            rows={3}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => onTokenChange(event.target.value)}
          />
          <div className="settings-actions">
            <Button
              variant="primary"
              disabled={token.trim().length === 0 || busy !== null}
              onClick={onInstall}
            >
              {busy === 'install' ? t('license.installing') : t('license.install')}
            </Button>
            {view.source === 'database' ? (
              <Button variant="secondary" disabled={busy !== null} onClick={onRemove}>
                {busy === 'remove' ? t('license.removing') : t('license.remove')}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
};

/** Loads the licence and keeps the screen in step with the API. */
export const LicensePanel = ({ api, canManage, demo = false }: LicensePanelProps) => {
  const t = useT();
  const toast = useToast();
  const [view, setView] = useState<LicenseView | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'install' | 'remove' | 'refresh' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setView(await api.get());
    } catch (loadError) {
      setError(messageOf(loadError, t('license.loadError')));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton shape="block" height={240} />;
  if (!view) {
    return (
      <EmptyState
        tone="error"
        title={t('license.loadError')}
        description={error ?? t('common.genericError')}
      />
    );
  }

  const install = async (): Promise<void> => {
    setBusy('install');
    setError(null);
    try {
      setView(await api.install(token.trim()));
      setToken('');
      toast.push({ tone: 'success', title: t('license.installed') });
    } catch (installError) {
      setError(messageOf(installError, t('common.genericError')));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy('remove');
    setError(null);
    try {
      setView(await api.remove());
      toast.push({ tone: 'info', title: t('license.removed') });
    } catch (removeError) {
      setError(messageOf(removeError, t('common.genericError')));
    } finally {
      setBusy(null);
    }
  };

  const refresh = async (): Promise<void> => {
    setBusy('refresh');
    setError(null);
    try {
      await api.refresh();
      setView(await api.get());
      toast.push({ tone: 'success', title: t('license.refreshed') });
    } catch (refreshError) {
      setError(messageOf(refreshError, t('common.genericError')));
    } finally {
      setBusy(null);
    }
  };

  return (
    <LicenseDetails
      view={view}
      canManage={canManage}
      demo={demo}
      token={token}
      busy={busy}
      error={error}
      onTokenChange={setToken}
      onInstall={() => void install()}
      onRemove={() => void remove()}
      onRefresh={() => void refresh()}
    />
  );
};

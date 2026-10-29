import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AppCategory, AppPermission, AppStoreEntry, ExternalAppPreview } from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Skeleton,
  Switch,
  TextField,
  useT,
  useToast,
  type IconName,
  type MessageKey,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import { AppSandbox } from './AppSandbox.js';
import type { AppsApi } from './api.js';

const CATEGORY_LABEL_KEYS: Record<AppCategory, MessageKey> = {
  marketing: 'appCategory.marketing',
  communication: 'appCategory.communication',
  analytics: 'appCategory.analytics',
  content: 'appCategory.content',
};

/** Each first-party App gets a recognisable glyph in the store. */
const APP_ICONS: Record<string, IconName> = {
  'seo-booster': 'search',
  'google-analytics': 'chart-bar',
  'line-notify': 'bell',
  'newsletter-sender': 'mail',
  booking: 'calendar',
};

const iconFor = (key: string): IconName => APP_ICONS[key] ?? 'layers';

const PERMISSION_LABEL_KEYS: Record<AppPermission, MessageKey> = {
  'contents:read': 'appPermission.contentsRead',
  'contents:write:own': 'appPermission.contentsWriteOwn',
  'forms:read': 'appPermission.formsRead',
  'email:send': 'appPermission.emailSend',
  'media:read': 'appPermission.mediaRead',
  'media:write': 'appPermission.mediaWrite',
  'analytics:read': 'appPermission.analyticsRead',
};

export interface AppsViewProps {
  entries: AppStoreEntry[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onInstall: (appKey: string) => void;
  onToggle: (appKey: string, enabled: boolean) => void;
  onUninstall: (appKey: string) => void;
  onOpenSandbox: (entry: AppStoreEntry) => void;
  onRetry: () => void;
  /** Validates a developer-hosted manifest; absent in read-only views. */
  onPreviewExternal?: (url: string) => Promise<ExternalAppPreview>;
  onInstallExternal?: (url: string) => Promise<void>;
  /** Tab strip of the growth screens, rendered inside this screen's header. */
  headerTabs?: ReactNode;
}

/**
 * Installs an App that a developer hosts: paste the manifest URL, review the
 * scopes the API reported, then install (docs/design/16-apps.md 16.3).
 */
const ExternalAppCard = ({
  onPreview,
  onInstall,
}: {
  onPreview: (url: string) => Promise<ExternalAppPreview>;
  onInstall: (url: string) => Promise<void>;
}) => {
  const t = useT();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ExternalAppPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setPreview(await onPreview(url.trim()));
    } catch (previewError) {
      setPreview(null);
      setError(previewError instanceof ApiError ? previewError.message : t('apps.externalError'));
    } finally {
      setBusy(false);
    }
  };

  const install = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await onInstall(url.trim());
      setUrl('');
      setPreview(null);
    } catch (installError) {
      setError(installError instanceof ApiError ? installError.message : t('apps.externalError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="apps-card apps-card--external">
      <div className="apps-card__head">
        <span className="apps-card__icon" aria-hidden="true">
          <Icon name="globe" size={20} />
        </span>
        <div className="apps-card__heading">
          <h2 className="apps-card__name">{t('apps.externalTitle')}</h2>
          <p className="apps-card__description">{t('apps.externalHint')}</p>
        </div>
      </div>
      <TextField
        id="external-app-url"
        label={t('apps.externalUrl')}
        placeholder="https://example.com/lumio-manifest.json"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      {error ? <Banner tone="warning">{error}</Banner> : null}
      {preview ? (
        <div className="apps-card__permissions">
          <p className="apps-card__permissions-title">{preview.manifest.name}</p>
          <p className="apps-card__description">{preview.manifest.description}</p>
          <ul className="apps-card__permission-list">
            {preview.manifest.permissions.map((permission) => (
              <li key={permission} className="apps-card__permission">
                {t(PERMISSION_LABEL_KEYS[permission])}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="apps-card__actions">
        {preview ? (
          <Button disabled={busy} onClick={() => void install()}>
            {t('apps.externalInstall')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy || url.trim().length === 0}
            onClick={() => void check()}
          >
            {t('apps.externalCheck')}
          </Button>
        )}
      </div>
    </Card>
  );
};

const AppCard = ({
  entry,
  canManage,
  onInstall,
  onToggle,
  onUninstall,
  onOpenSandbox,
}: {
  entry: AppStoreEntry;
  canManage: boolean;
  onInstall: (appKey: string) => void;
  onToggle: (appKey: string, enabled: boolean) => void;
  onUninstall: (appKey: string) => void;
  onOpenSandbox: (entry: AppStoreEntry) => void;
}) => {
  const t = useT();

  return (
    <Card className="apps-card">
      <div className="apps-card__head">
        <span className="apps-card__icon" aria-hidden="true">
          <Icon name={iconFor(entry.key)} size={20} />
        </span>
        <div className="apps-card__heading">
          <h2 className="apps-card__name">{entry.name}</h2>
          <span className="apps-card__category">{t(CATEGORY_LABEL_KEYS[entry.category])}</span>
        </div>
      </div>
      <p className="apps-card__description">{entry.description}</p>

      <div className="apps-card__permissions">
        <p className="apps-card__permissions-title">{t('apps.permissionsTitle')}</p>
        <ul className="apps-card__permission-list">
          {entry.permissions.map((permission) => (
            <li key={permission} className="apps-card__permission">
              {t(PERMISSION_LABEL_KEYS[permission])}
            </li>
          ))}
        </ul>
      </div>

      <div className="apps-card__actions">
        {entry.installed ? (
          <Button variant="secondary" size="sm" onClick={() => onOpenSandbox(entry)}>
            {t('apps.openSandbox')}
          </Button>
        ) : null}

        {canManage ? (
          entry.installed ? (
            <>
              <span className="apps-card__toggle">
                <Switch
                  label={entry.enabled ? t('apps.enabled') : t('apps.disabled')}
                  checked={entry.enabled}
                  onChange={(checked) => onToggle(entry.key, checked)}
                />
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="apps-card__uninstall"
                onClick={() => onUninstall(entry.key)}
              >
                {t('apps.uninstall')}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="apps-card__install"
              onClick={() => onInstall(entry.key)}
            >
              {t('apps.install')}
            </Button>
          )
        ) : (
          <p className="apps-card__readonly">
            {entry.installed ? t('apps.installed') : t('apps.notInstalled')}
          </p>
        )}
      </div>
    </Card>
  );
};

/**
 * The App store (docs/design/05-admin-ia.md "เติบโต › Apps", 16-apps.md). Each
 * card lists the permission scopes an App asks for before the owner installs it.
 */
export const AppsView = ({
  entries,
  loading,
  error,
  canManage,
  onInstall,
  onToggle,
  onUninstall,
  onOpenSandbox,
  onRetry,
  onPreviewExternal,
  onInstallExternal,
  headerTabs,
}: AppsViewProps) => {
  const t = useT();

  const header = (
    <PageHeader
      eyebrow={t('nav.section.site')}
      title={t('nav.apps')}
      description={t('apps.subtitle')}
      tabs={headerTabs}
    />
  );

  if (loading && entries.length === 0) {
    return (
      <div className="growth">
        {header}
        <Skeleton shape="block" height={160} />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="growth">
        {header}
        <EmptyState
          tone="error"
          title={error}
          description={t('growth.retryHint')}
          action={
            <Button variant="secondary" onClick={onRetry}>
              {t('growth.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const card = (entry: AppStoreEntry) => (
    <AppCard
      key={entry.key}
      entry={entry}
      canManage={canManage}
      onInstall={onInstall}
      onToggle={onToggle}
      onUninstall={onUninstall}
      onOpenSandbox={onOpenSandbox}
    />
  );
  const installed = entries.filter((entry) => entry.installed);
  const available = entries.filter((entry) => !entry.installed);

  return (
    <div className="growth">
      {header}
      {error ? <Banner tone="warning">{error}</Banner> : null}

      {installed.length > 0 ? (
        <section className="apps-section">
          <h2 className="apps-section__title">{t('apps.installedSection')}</h2>
          <div className="apps-grid">{installed.map(card)}</div>
        </section>
      ) : null}

      {available.length > 0 ? (
        <section className="apps-section">
          <h2 className="apps-section__title">{t('apps.availableSection')}</h2>
          <div className="apps-grid">{available.map(card)}</div>
        </section>
      ) : null}

      {canManage && onPreviewExternal && onInstallExternal ? (
        <ExternalAppCard onPreview={onPreviewExternal} onInstall={onInstallExternal} />
      ) : null}
    </div>
  );
};

export interface AppsPageProps {
  api: AppsApi;
  canManage: boolean;
  /** Tab strip of the growth screens. */
  headerTabs?: ReactNode;
}

export const AppsPage = ({ api, canManage, headerTabs }: AppsPageProps) => {
  const t = useT();
  const { push } = useToast();
  const [entries, setEntries] = useState<AppStoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState<AppStoreEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await api.store());
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async (appKey: string): Promise<void> => {
    try {
      await api.install(appKey);
      await load();
    } catch (installError) {
      setError(installError instanceof ApiError ? installError.message : t('apps.installError'));
    }
  };

  const toggle = async (appKey: string, enabled: boolean): Promise<void> => {
    try {
      await api.setEnabled(appKey, enabled);
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof ApiError ? toggleError.message : t('newsletter.toggleError'));
    }
  };

  const uninstall = async (appKey: string): Promise<void> => {
    try {
      await api.uninstall(appKey);
      await load();
      push({
        title: t('apps.uninstalled'),
        tone: 'success',
        undo: {
          onClick: () => {
            void api.install(appKey).then(load);
          },
        },
      });
    } catch (uninstallError) {
      setError(
        uninstallError instanceof ApiError ? uninstallError.message : t('apps.uninstallError'),
      );
    }
  };

  return (
    <>
      <AppsView
        entries={entries}
        loading={loading}
        error={error}
        canManage={canManage}
        onInstall={(appKey) => void install(appKey)}
        onToggle={(appKey, enabled) => void toggle(appKey, enabled)}
        onUninstall={(appKey) => void uninstall(appKey)}
        onOpenSandbox={setSandbox}
        onRetry={() => void load()}
        onPreviewExternal={(url) => api.previewExternal(url)}
        onInstallExternal={async (url) => {
          await api.installExternal(url);
          await load();
        }}
        {...(headerTabs ? { headerTabs } : {})}
      />

      {sandbox ? (
        <AppSandbox
          appKey={sandbox.key}
          appName={sandbox.name}
          permissions={sandbox.permissions}
          entry={sandbox.entry ?? null}
          call={(method, params) => api.callBridge(sandbox.key, method, params)}
          onClose={() => setSandbox(null)}
        />
      ) : null}
    </>
  );
};

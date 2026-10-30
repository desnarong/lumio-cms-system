import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type {
  InstalledPack,
  MarketplacePack,
  MarketplacePackSummary,
  MarketplaceView as MarketplaceViewData,
} from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Skeleton,
  Switch,
  Textarea,
  useT,
  useToast,
  useUiLocale,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { MarketplaceApi } from './api.js';

const nameOf = (entry: { name: string; nameEn: string | null }, locale: 'th' | 'en'): string =>
  locale === 'en' ? (entry.nameEn ?? entry.name) : entry.name;

const descriptionOf = (
  entry: { description: string; descriptionEn: string | null },
  locale: 'th' | 'en',
): string => (locale === 'en' ? (entry.descriptionEn ?? entry.description) : entry.description);

export interface MarketplaceViewProps {
  view: MarketplaceViewData;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onInstall: (packKey: string) => void;
  onToggle: (packKey: string, enabled: boolean) => void;
  onRemove: (packKey: string) => void;
  onRetry: () => void;
  /** Checks a signed token and installs it; absent in read-only views. */
  onInstallToken?: (token: string, preview: boolean) => Promise<MarketplacePack | void>;
  headerTabs?: ReactNode;
}

/** One catalogue card: what the pack adds, who made it and how it is licensed. */
const PackCard = ({
  entry,
  canManage,
  onInstall,
}: {
  entry: MarketplacePackSummary;
  canManage: boolean;
  onInstall: (packKey: string) => void;
}) => {
  const t = useT();
  const locale = useUiLocale();

  return (
    <Card className="apps-card">
      <div className="apps-card__head">
        <span className="apps-card__icon" aria-hidden="true">
          <Icon name="layers" size={20} />
        </span>
        <div className="apps-card__heading">
          <h2 className="apps-card__name">{nameOf(entry, locale)}</h2>
          <span className="apps-card__category">
            {t('marketplace.byAuthor', { author: entry.author })}
          </span>
        </div>
      </div>
      <p className="apps-card__description">{descriptionOf(entry, locale)}</p>
      <dl className="marketplace-meta">
        <div>
          <dt>{t('marketplace.version')}</dt>
          <dd>{entry.version}</dd>
        </div>
        <div>
          <dt>{t('marketplace.sections')}</dt>
          <dd>{entry.sectionCount}</dd>
        </div>
        {entry.license ? (
          <div>
            <dt>{t('marketplace.license')}</dt>
            <dd>{entry.license}</dd>
          </div>
        ) : null}
      </dl>

      <div className="apps-card__actions">
        {canManage ? (
          <Button
            variant="secondary"
            size="sm"
            className="apps-card__install"
            onClick={() => onInstall(entry.key)}
          >
            {t('marketplace.install')}
          </Button>
        ) : (
          <p className="apps-card__readonly">{t('marketplace.notInstalled')}</p>
        )}
      </div>
    </Card>
  );
};

/** An installed pack: version, on/off switch and removal with an undo toast. */
const InstalledCard = ({
  pack,
  canManage,
  onToggle,
  onRemove,
  title,
}: {
  pack: InstalledPack;
  canManage: boolean;
  onToggle: (packKey: string, enabled: boolean) => void;
  onRemove: (packKey: string) => void;
  title: string;
}) => {
  const t = useT();

  return (
    <Card className="apps-card">
      <div className="apps-card__head">
        <span className="apps-card__icon" aria-hidden="true">
          <Icon name="package" size={20} />
        </span>
        <div className="apps-card__heading">
          <h2 className="apps-card__name">{title}</h2>
          <span className="apps-card__category">
            {t('marketplace.installedVersion', { version: pack.version })}
          </span>
        </div>
      </div>
      <dl className="marketplace-meta">
        <div>
          <dt>{t('marketplace.sections')}</dt>
          <dd>{pack.sectionCount}</dd>
        </div>
        <div>
          <dt>{t('marketplace.source')}</dt>
          <dd>
            {pack.source === 'official'
              ? t('marketplace.sourceOfficial')
              : pack.signed
                ? t('marketplace.sourceSigned')
                : t('marketplace.sourceExternal')}
          </dd>
        </div>
      </dl>

      <div className="apps-card__actions">
        {canManage ? (
          <>
            <span className="apps-card__toggle">
              <Switch
                label={pack.enabled ? t('marketplace.enabled') : t('marketplace.disabled')}
                checked={pack.enabled}
                onChange={(checked) => onToggle(pack.key, checked)}
              />
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="apps-card__uninstall"
              onClick={() => onRemove(pack.key)}
            >
              {t('marketplace.remove')}
            </Button>
          </>
        ) : (
          <p className="apps-card__readonly">
            {pack.enabled ? t('marketplace.enabled') : t('marketplace.disabled')}
          </p>
        )}
      </div>
    </Card>
  );
};

/**
 * Installs a vendor pack from the token the seller sent. The API verifies the
 * Ed25519 signature itself; this card only shows what was verified.
 */
const SignedPackCard = ({
  onInstallToken,
}: {
  onInstallToken: (token: string, preview: boolean) => Promise<MarketplacePack | void>;
}) => {
  const t = useT();
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<MarketplacePack | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (install: boolean): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await onInstallToken(token.trim(), !install);
      if (install) {
        setToken('');
        setPreview(null);
      } else if (result) {
        setPreview(result);
      }
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof ApiError ? caught.message : t('marketplace.tokenError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="apps-card apps-card--external">
      <div className="apps-card__head">
        <span className="apps-card__icon" aria-hidden="true">
          <Icon name="shield" size={20} />
        </span>
        <div className="apps-card__heading">
          <h2 className="apps-card__name">{t('marketplace.tokenTitle')}</h2>
          <p className="apps-card__description">{t('marketplace.tokenHint')}</p>
        </div>
      </div>
      <Textarea
        id="marketplace-pack-token"
        label={t('marketplace.tokenLabel')}
        rows={3}
        value={token}
        placeholder="lumio_pack_v1.…"
        onChange={(event) => setToken(event.target.value)}
      />
      {error ? <Banner tone="warning">{error}</Banner> : null}
      {preview ? (
        <div className="apps-card__permissions">
          <p className="apps-card__permissions-title">
            {preview.name} · {preview.version}
          </p>
          <p className="apps-card__description">{preview.description}</p>
          <ul className="apps-card__permission-list">
            {preview.sections.map((section) => (
              <li key={section.name} className="apps-card__permission">
                {section.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="apps-card__actions">
        {preview ? (
          <Button disabled={busy} onClick={() => void run(true)}>
            {t('marketplace.installToken')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy || token.trim().length === 0}
            onClick={() => void run(false)}
          >
            {t('marketplace.checkToken')}
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * ตลาดบล็อก (docs/design/05-admin-ia.md "เติบโต › ตลาดบล็อก"). Packs are data:
 * they add ready-made sections to the editor, never code to the site.
 */
export const MarketplaceView = ({
  view,
  loading,
  error,
  canManage,
  onInstall,
  onToggle,
  onRemove,
  onRetry,
  onInstallToken,
  headerTabs,
}: MarketplaceViewProps) => {
  const t = useT();
  const locale = useUiLocale();

  const header = (
    <PageHeader
      eyebrow={t('nav.section.site')}
      title={t('nav.marketplace')}
      description={t('marketplace.subtitle')}
      tabs={headerTabs}
    />
  );

  if (loading && view.catalog.length === 0) {
    return (
      <div className="growth">
        {header}
        <Skeleton shape="block" height={160} />
      </div>
    );
  }

  if (error && view.catalog.length === 0) {
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

  const installedKeys = new Set(view.installed.map((pack) => pack.key));
  const available = view.catalog.filter((entry) => !installedKeys.has(entry.key));
  const installedTitles = new Map(view.catalog.map((entry) => [entry.key, nameOf(entry, locale)]));

  return (
    <div className="growth">
      {header}
      {error ? <Banner tone="warning">{error}</Banner> : null}

      {view.installed.length > 0 ? (
        <section className="apps-section">
          <h2 className="apps-section__title">{t('marketplace.installedSection')}</h2>
          <div className="apps-grid">
            {view.installed.map((pack) => (
              <InstalledCard
                key={pack.key}
                pack={pack}
                title={installedTitles.get(pack.key) ?? pack.name}
                canManage={canManage}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </div>
        </section>
      ) : null}

      {available.length > 0 ? (
        <section className="apps-section">
          <h2 className="apps-section__title">{t('marketplace.catalogSection')}</h2>
          <div className="apps-grid">
            {available.map((entry) => (
              <PackCard key={entry.key} entry={entry} canManage={canManage} onInstall={onInstall} />
            ))}
          </div>
        </section>
      ) : null}

      {view.installed.length === 0 && available.length === 0 ? (
        <EmptyState title={t('marketplace.empty')} description={t('marketplace.emptyHint')} />
      ) : null}

      {canManage && onInstallToken ? <SignedPackCard onInstallToken={onInstallToken} /> : null}
    </div>
  );
};

export interface MarketplacePageProps {
  api: MarketplaceApi;
  canManage: boolean;
  headerTabs?: ReactNode;
}

export const MarketplacePage = ({ api, canManage, headerTabs }: MarketplacePageProps) => {
  const t = useT();
  const { push } = useToast();
  const [view, setView] = useState<MarketplaceViewData>({ catalog: [], installed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setView(await api.view());
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async (packKey: string): Promise<void> => {
    try {
      const pack = await api.install({ key: packKey });
      push({ title: t('marketplace.installedToast', { name: pack.name }), tone: 'success' });
      await load();
    } catch (installError) {
      setError(
        installError instanceof ApiError ? installError.message : t('marketplace.installError'),
      );
    }
  };

  const toggle = async (packKey: string, enabled: boolean): Promise<void> => {
    try {
      await api.setEnabled(packKey, enabled);
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof ApiError ? toggleError.message : t('common.genericError'));
    }
  };

  const remove = async (packKey: string): Promise<void> => {
    const previous = view;
    try {
      await api.remove(packKey);
      await load();
      push({
        title: t('marketplace.removed'),
        tone: 'success',
        undo: {
          onClick: () => {
            void api.install({ key: packKey }).then(load);
          },
        },
      });
    } catch (removeError) {
      setView(previous);
      setError(
        removeError instanceof ApiError ? removeError.message : t('marketplace.removeError'),
      );
    }
  };

  const installToken = async (token: string, preview: boolean): Promise<MarketplacePack | void> => {
    if (preview) return api.preview(token);
    const pack = await api.install({ token });
    push({ title: t('marketplace.installedToast', { name: pack.name }), tone: 'success' });
    await load();
  };

  return (
    <MarketplaceView
      view={view}
      loading={loading}
      error={error}
      canManage={canManage}
      onInstall={(packKey) => void install(packKey)}
      onToggle={(packKey, enabled) => void toggle(packKey, enabled)}
      onRemove={(packKey) => void remove(packKey)}
      onRetry={() => void load()}
      onInstallToken={installToken}
      {...(headerTabs ? { headerTabs } : {})}
    />
  );
};

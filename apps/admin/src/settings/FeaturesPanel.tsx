import { useEffect, useState } from 'react';
import {
  FEATURE_FLAG_META,
  type FeatureFlagKey,
  type FeatureFlagList,
  type FeatureFlagView,
} from '@lumio/shared';
import {
  Banner,
  Card,
  EmptyState,
  Skeleton,
  Switch,
  translateNow,
  useT,
  useToast,
  useUiLocale,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { SettingsApi } from './api.js';

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

const withFlag = (list: FeatureFlagList, key: FeatureFlagKey, enabled: boolean): FeatureFlagList => ({
  items: list.items.map((item) => (item.key === key ? { ...item, enabled } : item)),
});

export interface FeaturesViewProps {
  items: FeatureFlagView[];
  busy: FeatureFlagKey | null;
  error: string | null;
  onToggle: (key: FeatureFlagKey, enabled: boolean) => void;
}

/**
 * ตั้งค่า › ส่วนเสริม (docs/design/03-scope.md 3.6). Each switch closes one
 * capability for the whole site; leaving it alone keeps everything on, so the
 * screen never asks a person to understand a deployment.
 */
export const FeaturesView = ({ items, busy, error, onToggle }: FeaturesViewProps) => {
  const t = useT();
  const locale = useUiLocale();

  return (
    <div className="settings-panel">
      <Banner tone="info" title={t('settings.features.title')}>
        {t('settings.features.hint')}
      </Banner>

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.features.listTitle')}</h2>
        <p className="settings-card__hint">{t('settings.features.listHint')}</p>
        {items.map((item) => {
          const meta = FEATURE_FLAG_META[item.key];
          return (
            <Switch
              key={item.key}
              label={locale === 'en' ? meta.labelEn : meta.label}
              description={
                item.lockedByLicense
                  ? t('settings.features.licenseLocked')
                  : item.lockedByPlatform
                    ? t('settings.features.locked')
                    : locale === 'en'
                      ? meta.descriptionEn
                      : meta.description
              }
              checked={item.enabled}
              disabled={item.lockedByLicense || item.lockedByPlatform || busy !== null}
              onChange={(enabled) => onToggle(item.key, enabled)}
            />
          );
        })}
        {error ? (
          <p className="settings-error" role="alert">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
};

export const FeaturesPanel = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const locale = useUiLocale();
  const [list, setList] = useState<FeatureFlagList | null>(null);
  const [busy, setBusy] = useState<FeatureFlagKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void api
      .getFeatures()
      .then((loaded) => {
        if (active) setList(loaded);
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
  if (!list) {
    return (
      <EmptyState
        tone="error"
        title={t('settings.loadSiteError')}
        description={error ?? t('common.genericError')}
      />
    );
  }

  const nameOf = (key: FeatureFlagKey): string => {
    const meta = FEATURE_FLAG_META[key];
    return locale === 'en' ? meta.labelEn : meta.label;
  };

  const save = async (key: FeatureFlagKey, enabled: boolean, quiet = false): Promise<void> => {
    const previous = list;
    setBusy(key);
    setError(null);
    setList(withFlag(previous, key, enabled));
    try {
      const updated = await api.updateFeatures({ flags: { [key]: enabled } });
      setList(updated);
      if (quiet) return;
      toast.push({
        tone: 'success',
        title: enabled
          ? t('settings.features.turnedOn', { name: nameOf(key) })
          : t('settings.features.turnedOff', { name: nameOf(key) }),
        undo: { label: t('common.undo'), onClick: () => void save(key, !enabled, true) },
      });
    } catch (saveError) {
      setList(previous);
      setError(messageOf(saveError));
      toast.push({ tone: 'danger', title: messageOf(saveError) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <FeaturesView
      items={list.items}
      busy={busy}
      error={error}
      onToggle={(key, enabled) => void save(key, enabled)}
    />
  );
};

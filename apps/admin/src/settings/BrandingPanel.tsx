import { useCallback, useEffect, useState } from 'react';
import type { AgencyView } from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ImagePicker,
  Skeleton,
  Switch,
  TextField,
  useT,
  useToast,
} from '@lumio/ui';
import { useMediaPicker } from '@lumio/blocks';
import { ApiError } from '../api-error.js';
import type { AgencyApi } from './branding.js';

export interface BrandingPanelProps {
  api: AgencyApi;
  /** Only an owner may change the brand of the whole installation. */
  canManage: boolean;
  /** Lets the shell pick up the new brand without a reload. */
  onSaved?: (branding: AgencyView) => void;
}

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

/**
 * "ตั้งค่า › แบรนด์องค์กร" (docs/PROGRESS.md "งานนอก MVP"). White-labelling is a
 * paid capability: without a licence the screen explains what is missing and
 * keeps every field read-only instead of hiding the feature entirely.
 */
export const BrandingPanel = ({ api, canManage, onSaved }: BrandingPanelProps) => {
  const t = useT();
  const toast = useToast();
  const picker = useMediaPicker();
  const [brand, setBrand] = useState<AgencyView | null>(null);
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [hideBranding, setHideBranding] = useState(false);
  const [accentColor, setAccentColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (view: AgencyView): void => {
    setBrand(view);
    setBrandName(view.brandName);
    setLogoUrl(view.logoUrl);
    setSupportEmail(view.supportEmail ?? '');
    setHideBranding(view.hideBranding);
    setAccentColor(view.accentColor ?? '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      apply(await api.get());
    } catch (loadError) {
      setError(messageOf(loadError, t('branding.loadError')));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton shape="block" height={220} />;
  if (!brand) {
    return (
      <EmptyState
        tone="error"
        title={t('branding.loadError')}
        description={error ?? t('common.genericError')}
      />
    );
  }

  const editable = canManage && brand.licensed;

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.update({
        brandName: brandName.trim(),
        logoUrl,
        supportEmail: supportEmail.trim().length > 0 ? supportEmail.trim() : null,
        hideBranding,
        accentColor: accentColor.trim().length > 0 ? accentColor.trim() : null,
      });
      apply(updated);
      onSaved?.(updated);
      toast.push({ tone: 'success', title: t('branding.saved') });
    } catch (saveError) {
      setError(messageOf(saveError, t('common.genericError')));
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = async (): Promise<void> => {
    if (!picker) return;
    const picked = await picker.pick({ aspect: 'wide' });
    if (picked?.url) setLogoUrl(picked.url);
  };

  return (
    <div className="settings-panel">
      {brand.licensed ? null : (
        <Banner tone="warning" title={t('branding.lockedTitle')}>
          {t('branding.lockedBody')}
        </Banner>
      )}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('branding.title')}</h2>
        <p className="settings-card__hint">{t('branding.subtitle')}</p>

        <TextField
          label={t('branding.brandName')}
          hint={t('branding.brandNameHint')}
          value={brandName}
          disabled={!editable}
          onChange={(event) => setBrandName(event.target.value)}
        />
        <ImagePicker
          label={t('branding.logo')}
          hint={t('branding.logoHint')}
          aspect="wide"
          value={logoUrl}
          alt={brandName}
          disabled={!editable}
          {...(editable && picker ? { onPick: () => void pickLogo() } : {})}
          {...(editable ? { onChange: () => setLogoUrl(null) } : {})}
        />
        <TextField
          label={t('branding.supportEmail')}
          hint={t('branding.supportEmailHint')}
          type="email"
          value={supportEmail}
          disabled={!editable}
          onChange={(event) => setSupportEmail(event.target.value)}
        />
        <TextField
          label={t('branding.accentColor')}
          hint={t('branding.accentHint')}
          value={accentColor}
          disabled={!editable}
          placeholder="#17469d"
          onChange={(event) => setAccentColor(event.target.value)}
        />
        <div className="settings-switch">
          <Switch
            label={t('branding.hideBranding')}
            description={t('branding.hideBrandingHint')}
            checked={hideBranding}
            disabled={!editable}
            onChange={(next) => setHideBranding(next)}
          />
        </div>

        {error ? (
          <p className="settings-error" role="alert">
            {error}
          </p>
        ) : null}
        {editable ? (
          <div className="settings-actions">
            <Button variant="primary" disabled={saving} onClick={() => void save()}>
              {saving ? t('settings.saving') : t('common.save')}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

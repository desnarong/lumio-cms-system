import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONTENT_TRASH_RETENTION_DAYS,
  localeLabel,
  normalizeLocales,
  ROLES,
  SUPPORTED_LOCALES,
  trashDaysLeft,
  type BackupOverview,
  type BackupScheduleInput,
  type BackupSnapshot,
  type ContentSummary,
  type DomainSummary,
  type FeatureFlagKey,
  type MemberSummary,
  type Role,
  type SiteImportInput,
  type SiteImportResult,
  type SiteSummary,
} from '@lumio/shared';
import {
  Icon,
  Banner,
  Button,
  Card,
  EmptyState,
  ImagePicker,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Switch,
  Tabs,
  TextField,
  translateNow,
  useT,
  useToast,
  type MessageKey,
} from '@lumio/ui';
import { useMediaPicker } from '@lumio/blocks';
import { ApiError } from '../api-error.js';
import { SETTINGS_TABS, type SettingsTab } from '../route.js';
import { allowedTabs } from '../shell/nav.js';
import type { SettingsApi } from './api.js';
import { BillingPanel } from './BillingPanel.js';
import type { AuthApi } from '../auth/api.js';
import type { BillingApi } from './billing.js';
import { SecurityPanel } from './SecurityPanel.js';
import { RedirectsTab } from './RedirectsPanel.js';
import { EmailPanel } from './EmailPanel.js';
import { PublishPanel } from './PublishPanel.js';
import { FeaturesPanel } from './FeaturesPanel.js';
import { ApiKeysPanel } from './ApiKeysPanel.js';
import { BrandingPanel } from './BrandingPanel.js';
import type { ApiKeysApi } from './api-keys.js';
import type { AgencyApi } from './branding.js';

export interface SettingsPageProps {
  api: SettingsApi;
  billing: BillingApi;
  tab: SettingsTab;
  onNavigate: (path: string) => void;
  /** Who is signed in: tabs the role cannot open are not offered at all. */
  role: Role;
  /** Add-ons the site still offers; closed ones lose their tab. */
  features?: readonly FeatureFlagKey[];
  /** The signed-in account's API, for two-factor settings. */
  security?: AuthApi;
  /** Public API keys of this site. */
  apiKeys?: ApiKeysApi;
  /** White-label branding of the installation. */
  agency?: AgencyApi;
  /** True when every client is in-memory. */
  demo?: boolean;
}

const ROLE_LABEL_KEYS: Record<Role, MessageKey> = {
  owner: 'role.owner',
  admin: 'role.admin',
  editor: 'role.editor',
  author: 'role.author',
  viewer: 'role.viewer',
};

export const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

/** Saves a generated backup file in the browser without a round trip. */
const downloadFile = (filename: string, content: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

/** Ordered by how often the owner needs them, not by the schema. */
const TABS: { id: SettingsTab; labelKey: MessageKey }[] = [
  { id: 'general', labelKey: 'nav.general' },
  { id: 'domain', labelKey: 'nav.domain' },
  { id: 'team', labelKey: 'nav.team' },
  { id: 'backup', labelKey: 'nav.backup' },
  { id: 'language', labelKey: 'settings.tabLanguage' },
  { id: 'email', labelKey: 'settings.tabEmail' },
  { id: 'publish', labelKey: 'settings.tabPublish' },
  { id: 'redirects', labelKey: 'settings.tabRedirects' },
  { id: 'features', labelKey: 'settings.tabFeatures' },
  { id: 'api-keys', labelKey: 'settings.tabApiKeys' },
  { id: 'branding', labelKey: 'settings.tabBranding' },
  { id: 'billing', labelKey: 'nav.billing' },
];

/* ------------------------------------------------------------------ general */

export interface GeneralViewProps {
  site: SiteSummary;
  name: string;
  subdomain: string;
  saving: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onSubdomainChange: (value: string) => void;
  onSave: () => void;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  /** True once the owner picked or removed a brand image. */
  brandDirty?: boolean;
  onPickLogo?: () => void;
  onPickFavicon?: () => void;
  onRemoveLogo?: () => void;
  onRemoveFavicon?: () => void;
}

export const GeneralView = ({
  site,
  name,
  subdomain,
  saving,
  error,
  onNameChange,
  onSubdomainChange,
  onSave,
  logoUrl = null,
  faviconUrl = null,
  brandDirty = false,
  onPickLogo,
  onPickFavicon,
  onRemoveLogo,
  onRemoveFavicon,
}: GeneralViewProps) => {
  const t = useT();
  const dirty = name.trim() !== site.name || subdomain.trim() !== site.subdomain || brandDirty;

  return (
    <div className="settings-panel">
      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.general.title')}</h2>
        <TextField
          label={t('settings.general.name')}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <TextField
          label={t('settings.general.subdomain')}
          value={subdomain}
          hint={t('settings.general.subdomainHint', {
            host: subdomain || t('settings.general.name'),
          })}
          onChange={(event) => onSubdomainChange(event.target.value.toLowerCase())}
        />
        <section className="settings-brand" aria-labelledby="settings-brand-title">
          <h3 className="settings-brand__title" id="settings-brand-title">
            {t('settings.brand.title')}
          </h3>
          <ImagePicker
            label={t('settings.brand.logo')}
            hint={t('settings.brand.logoHint')}
            aspect="wide"
            value={logoUrl}
            alt={site.name}
            {...(onPickLogo ? { onPick: onPickLogo } : {})}
            {...(onRemoveLogo ? { onChange: () => onRemoveLogo() } : {})}
          />
          <ImagePicker
            label={t('settings.brand.favicon')}
            hint={t('settings.brand.faviconHint')}
            aspect="square"
            value={faviconUrl}
            alt={site.name}
            {...(onPickFavicon ? { onPick: onPickFavicon } : {})}
            {...(onRemoveFavicon ? { onChange: () => onRemoveFavicon() } : {})}
          />
        </section>
        <div className="settings-actions">
          <Button variant="primary" disabled={!dirty || saving} onClick={onSave}>
            {saving ? t('settings.saving') : t('common.save')}
          </Button>
          {error ? (
            <span className="settings-error" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

const GeneralTab = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const picker = useMediaPicker();
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  // `undefined` means "untouched"; `null` removes the image.
  const [logoMediaId, setLogoMediaId] = useState<string | null | undefined>(undefined);
  const [faviconMediaId, setFaviconMediaId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .getSite()
      .then((loaded) => {
        if (!active) return;
        setSite(loaded);
        setName(loaded.name);
        setSubdomain(loaded.subdomain);
        setLogoUrl(loaded.logoUrl);
        setFaviconUrl(loaded.faviconUrl);
        setLogoMediaId(undefined);
        setFaviconMediaId(undefined);
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

  if (loading) return <Skeleton shape="block" height={200} />;
  if (!site) {
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
      const settings: Record<string, unknown> = {};
      if (logoMediaId !== undefined) settings.logoMediaId = logoMediaId;
      if (faviconMediaId !== undefined) settings.faviconMediaId = faviconMediaId;

      const updated = await api.updateSite({
        name: name.trim(),
        subdomain: subdomain.trim(),
        ...(Object.keys(settings).length > 0 ? { settings } : {}),
      });
      setSite(updated);
      setName(updated.name);
      setSubdomain(updated.subdomain);
      setLogoUrl(updated.logoUrl);
      setFaviconUrl(updated.faviconUrl);
      setLogoMediaId(undefined);
      setFaviconMediaId(undefined);
      toast.push({ tone: 'success', title: t('settings.saved') });
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const pickBrand = async (kind: 'logo' | 'favicon'): Promise<void> => {
    if (!picker) return;
    const picked = await picker.pick({ aspect: kind === 'favicon' ? 'square' : 'wide' });
    if (!picked?.mediaId) return;
    if (kind === 'logo') {
      setLogoUrl(picked.url);
      setLogoMediaId(picked.mediaId);
    } else {
      setFaviconUrl(picked.url);
      setFaviconMediaId(picked.mediaId);
    }
  };

  const brandDirty = logoMediaId !== undefined || faviconMediaId !== undefined;

  return (
    <GeneralView
      site={site}
      name={name}
      subdomain={subdomain}
      saving={saving}
      error={error}
      onNameChange={setName}
      onSubdomainChange={setSubdomain}
      onSave={() => void save()}
      logoUrl={logoUrl}
      faviconUrl={faviconUrl}
      brandDirty={brandDirty}
      onPickLogo={() => void pickBrand('logo')}
      onPickFavicon={() => void pickBrand('favicon')}
      onRemoveLogo={() => {
        setLogoUrl(null);
        setLogoMediaId(null);
      }}
      onRemoveFavicon={() => {
        setFaviconUrl(null);
        setFaviconMediaId(null);
      }}
    />
  );
};

/* ---------------------------------------------------------------- languages */

export interface LanguageViewProps {
  site: SiteSummary;
  locales: string[];
  defaultLocale: string;
  saving: boolean;
  error: string | null;
  onToggle: (locale: string) => void;
  onDefaultChange: (locale: string) => void;
  onSave: () => void;
}

/**
 * Languages the site offers (docs/design/17-i18n.md 17.3). Adding a language
 * here makes the language switcher appear in the editor; the pages themselves
 * are translated one by one from the language button in the editor.
 */
export const LanguageView = ({
  site,
  locales,
  defaultLocale,
  saving,
  error,
  onToggle,
  onDefaultChange,
  onSave,
}: LanguageViewProps) => {
  const t = useT();
  const dirty =
    locales.slice().sort().join(',') !== site.locales.slice().sort().join(',') ||
    defaultLocale !== site.localeDefault;

  return (
    <div className="settings-panel">
      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.language.title')}</h2>
        <p className="settings-hint">{t('settings.language.hint')}</p>
        <ul className="settings-locale-list">
          {SUPPORTED_LOCALES.map((locale) => {
            const offered = locales.includes(locale);
            const isDefault = defaultLocale === locale;
            return (
              <li className="settings-locale" key={locale}>
                <label className="settings-locale__toggle">
                  <input
                    type="checkbox"
                    checked={offered}
                    disabled={isDefault}
                    onChange={() => onToggle(locale)}
                  />
                  <span className="settings-locale__name">{localeLabel(locale)}</span>
                </label>
                <label className="settings-locale__default">
                  <input
                    type="radio"
                    name="locale-default"
                    checked={isDefault}
                    disabled={!offered}
                    onChange={() => onDefaultChange(locale)}
                  />
                  <span>{t('settings.language.primary')}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {error ? (
          <p className="settings-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="settings-actions">
          <Button variant="primary" disabled={!dirty || saving} onClick={onSave}>
            {saving ? t('settings.saving') : t('common.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

const LanguageTab = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [locales, setLocales] = useState<string[]>(['th']);
  const [defaultLocale, setDefaultLocale] = useState('th');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .getSite()
      .then((loaded) => {
        if (!active) return;
        setSite(loaded);
        setLocales(loaded.locales);
        setDefaultLocale(loaded.localeDefault);
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

  if (loading) return <Skeleton shape="block" height={200} />;
  if (!site) {
    return (
      <EmptyState
        tone="error"
        title={t('settings.loadSiteError')}
        description={error ?? t('common.genericError')}
      />
    );
  }

  const toggle = (locale: string): void => {
    setLocales((current) =>
      current.includes(locale) ? current.filter((entry) => entry !== locale) : [...current, locale],
    );
  };

  const changeDefault = (locale: string): void => {
    setDefaultLocale(locale);
    setLocales((current) => (current.includes(locale) ? current : [...current, locale]));
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateSite({
        locales: normalizeLocales(locales, defaultLocale),
        localeDefault: defaultLocale,
      });
      setSite(updated);
      setLocales(updated.locales);
      setDefaultLocale(updated.localeDefault);
      toast.push({ tone: 'success', title: t('settings.saved') });
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <LanguageView
      site={site}
      locales={locales}
      defaultLocale={defaultLocale}
      saving={saving}
      error={error}
      onToggle={toggle}
      onDefaultChange={changeDefault}
      onSave={() => void save()}
    />
  );
};

/* ------------------------------------------------------------------- domain */

export interface DomainViewProps {
  domains: DomainSummary[];
  cnameTarget: string;
  hostname: string;
  busy: boolean;
  error: string | null;
  onHostnameChange: (value: string) => void;
  onAdd: () => void;
  onVerify: (domain: DomainSummary) => void;
  onRemove: (domain: DomainSummary) => void;
}

export const DomainView = ({
  domains,
  cnameTarget,
  hostname,
  busy,
  error,
  onHostnameChange,
  onAdd,
  onVerify,
  onRemove,
}: DomainViewProps) => {
  const t = useT();

  return (
    <div className="settings-panel">
      <Banner tone="info" title={t('settings.domain.freeAddress', { host: cnameTarget })}>
        {t('settings.domain.freeHint')}
      </Banner>
      <p className="settings-hint">{t('settings.domain.autoHint')}</p>

      {error ? (
        <p className="settings-error" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.domain.addTitle')}</h2>
        <div className="settings-inline">
          <TextField
            label={t('settings.domain.hostname')}
            placeholder="yourbrand.com"
            value={hostname}
            onChange={(event) => onHostnameChange(event.target.value.toLowerCase())}
          />
          <Button variant="primary" disabled={busy || hostname.trim().length === 0} onClick={onAdd}>
            {t('settings.domain.add')}
          </Button>
        </div>
      </Card>

      {domains.length === 0 ? (
        <EmptyState
          illustration={<Icon name="globe" size={32} />}
          title={t('settings.domain.emptyTitle')}
          description={t('settings.domain.emptyHint')}
        />
      ) : (
        <ul className="settings-list">
          {domains.map((domain) => (
            <li key={domain.id} className="settings-row">
              <div className="settings-row__main">
                <span className="settings-row__title">{domain.hostname}</span>
                <span className="settings-row__meta">
                  {domain.sslStatus === 'active'
                    ? t('settings.domain.active')
                    : t('settings.domain.waiting')}
                </span>
              </div>
              <div className="settings-row__actions">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => onVerify(domain)}
                >
                  {t('settings.domain.verify')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onRemove(domain)}>
                  {t('common.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const DomainTab = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [cnameTarget, setCnameTarget] = useState('');
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .listDomains()
      .then((result) => {
        if (!active) return;
        setDomains(result.items);
        setCnameTarget(result.cnameTarget);
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

  const add = async (): Promise<void> => {
    if (hostname.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.addDomain({ hostname: hostname.trim(), isPrimary: false });
      setDomains((current) => [...current, created]);
      setHostname('');
      toast.push({ tone: 'success', title: t('settings.domain.added') });
    } catch (addError) {
      setError(messageOf(addError));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (domain: DomainSummary): Promise<void> => {
    setBusy(true);
    try {
      const result = await api.verifyDomain(domain.id);
      setDomains((current) =>
        current.map((item) => (item.id === domain.id ? result.domain : item)),
      );
      toast.push(
        result.verified
          ? { tone: 'success', title: t('settings.domain.verified') }
          : {
              tone: 'warning',
              title: t('settings.domain.notFound'),
              description: t('settings.domain.notFoundBody', {
                hostname: domain.hostname,
                target: cnameTarget,
              }),
            },
      );
    } catch (verifyError) {
      toast.push({ tone: 'danger', title: messageOf(verifyError) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (domain: DomainSummary): Promise<void> => {
    const snapshot = domains;
    setDomains((current) => current.filter((item) => item.id !== domain.id));
    try {
      await api.removeDomain(domain.id);
      toast.push({
        tone: 'success',
        title: t('settings.domain.removed'),
        undo: {
          label: t('common.undo'),
          onClick: () => {
            setDomains(snapshot);
            void api
              .addDomain({ hostname: domain.hostname, isPrimary: domain.isPrimary })
              .catch(() => undefined);
          },
        },
      });
    } catch (removeError) {
      setDomains(snapshot);
      toast.push({ tone: 'danger', title: messageOf(removeError) });
    }
  };

  if (loading) return <Skeleton shape="block" height={220} />;

  return (
    <DomainView
      domains={domains}
      cnameTarget={cnameTarget}
      hostname={hostname}
      busy={busy}
      error={error}
      onHostnameChange={setHostname}
      onAdd={() => void add()}
      onVerify={(domain) => void verify(domain)}
      onRemove={(domain) => void remove(domain)}
    />
  );
};

/* --------------------------------------------------------------------- team */

export interface TeamViewProps {
  members: MemberSummary[];
  email: string;
  role: Role;
  busy: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onRoleChange: (role: Role) => void;
  onInvite: () => void;
  onMemberRoleChange: (member: MemberSummary, role: Role) => void;
  onRemove: (member: MemberSummary) => void;
}

export const TeamView = ({
  members,
  email,
  role,
  busy,
  error,
  onEmailChange,
  onRoleChange,
  onInvite,
  onMemberRoleChange,
  onRemove,
}: TeamViewProps) => {
  const t = useT();
  const roleOptions = ROLES.map((value) => ({ value, label: t(ROLE_LABEL_KEYS[value]) }));

  return (
    <div className="settings-panel">
      {error ? (
        <p className="settings-error" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.team.addTitle')}</h2>
        <div className="settings-inline">
          <TextField
            label={t('settings.team.email')}
            fieldClassName="settings-inline__field"
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
          <Select
            label={t('settings.team.role')}
            fieldClassName="settings-inline__role"
            options={roleOptions}
            value={role}
            onChange={(event) => onRoleChange(event.target.value as Role)}
          />
          <Button variant="primary" disabled={busy || email.trim().length === 0} onClick={onInvite}>
            {t('settings.team.add')}
          </Button>
        </div>
      </Card>

      <ul className="settings-list">
        {members.map((member) => (
          <li key={member.userId} className="settings-row">
            <div className="settings-row__main">
              <span className="settings-row__title">{member.name ?? member.email}</span>
              <span className="settings-row__meta">{member.email}</span>
            </div>
            {member.role === 'owner' ? (
              <span className="settings-row__owner">{t('settings.team.owner')}</span>
            ) : (
              <Select
                aria-label={t('settings.team.role')}
                fieldClassName="settings-row__role"
                options={roleOptions}
                value={member.role}
                onChange={(event) => onMemberRoleChange(member, event.target.value as Role)}
              />
            )}
            <div className="settings-row__actions">
              {member.role === 'owner' ? null : (
                <Button variant="ghost" size="sm" onClick={() => onRemove(member)}>
                  {t('settings.team.remove')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const TeamTab = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .listMembers()
      .then((loaded) => {
        if (active) setMembers(loaded);
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

  const invite = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.inviteMember({ email: email.trim(), role });
      setMembers((current) => [...current, created]);
      setEmail('');
      toast.push({ tone: 'success', title: t('settings.team.added') });
    } catch (inviteError) {
      setError(messageOf(inviteError));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: MemberSummary, next: Role): Promise<void> => {
    try {
      const updated = await api.updateMemberRole(member.userId, { role: next });
      setMembers((current) =>
        current.map((item) => (item.userId === member.userId ? updated : item)),
      );
    } catch (updateError) {
      toast.push({ tone: 'danger', title: messageOf(updateError) });
    }
  };

  const remove = async (member: MemberSummary): Promise<void> => {
    const snapshot = members;
    setMembers((current) => current.filter((item) => item.userId !== member.userId));
    try {
      await api.removeMember(member.userId);
      toast.push({
        tone: 'success',
        title: t('settings.team.removed'),
        undo: {
          label: t('common.undo'),
          onClick: () => {
            setMembers(snapshot);
            void api
              .inviteMember({ email: member.email, role: member.role })
              .catch(() => undefined);
          },
        },
      });
    } catch (removeError) {
      setMembers(snapshot);
      toast.push({ tone: 'danger', title: messageOf(removeError) });
    }
  };

  if (loading) return <Skeleton shape="block" height={220} />;

  return (
    <TeamView
      members={members}
      email={email}
      role={role}
      busy={busy}
      error={error}
      onEmailChange={setEmail}
      onRoleChange={setRole}
      onInvite={() => void invite()}
      onMemberRoleChange={(member, next) => void changeRole(member, next)}
      onRemove={(member) => void remove(member)}
    />
  );
};

/* ------------------------------------------------------------------- backup */

const TYPE_LABEL_KEYS: Record<ContentSummary['type'], MessageKey> = {
  page: 'content.headingPage',
  post: 'content.headingPost',
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));

const RETENTION_OPTIONS = [7, 14, 30, 60].map((days) => ({
  value: String(days),
  label: String(days),
}));

/** The daily snapshot card in ตั้งค่า › Backup (docs/design/03-scope.md "Auto Backup"). */
export interface BackupScheduleViewProps {
  overview: BackupOverview;
  enabled: boolean;
  hour: number;
  retentionDays: number;
  saving: boolean;
  running: boolean;
  error: string | null;
  onEnabledChange: (value: boolean) => void;
  onHourChange: (value: number) => void;
  onRetentionChange: (value: number) => void;
  onSave: () => void;
  onRunNow: () => void;
  onDownload: (snapshot: BackupSnapshot) => void;
}

export const BackupScheduleView = ({
  overview,
  enabled,
  hour,
  retentionDays,
  saving,
  running,
  error,
  onEnabledChange,
  onHourChange,
  onRetentionChange,
  onSave,
  onRunNow,
  onDownload,
}: BackupScheduleViewProps) => {
  const t = useT();
  const dirty =
    enabled !== overview.schedule.enabled ||
    hour !== overview.schedule.hour ||
    retentionDays !== overview.schedule.retentionDays;

  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">{t('settings.backup.autoTitle')}</h2>
      <p className="settings-card__hint">{t('settings.backup.autoHint')}</p>

      <Switch
        label={t('settings.backup.autoEnabled')}
        checked={enabled}
        onChange={onEnabledChange}
      />

      <div className="settings-inline">
        <Select
          label={t('settings.backup.autoHour')}
          options={HOUR_OPTIONS}
          value={String(hour)}
          disabled={!enabled}
          onChange={(event) => onHourChange(Number(event.target.value))}
        />
        <Select
          label={t('settings.backup.autoRetention')}
          options={RETENTION_OPTIONS}
          value={String(retentionDays)}
          disabled={!enabled}
          onChange={(event) => onRetentionChange(Number(event.target.value))}
        />
      </div>

      <p className="settings-hint">
        {overview.schedule.lastRunAt
          ? t('settings.backup.autoLastRun', {
              when: overview.schedule.lastRunAt.slice(0, 16).replace('T', ' '),
            })
          : t('settings.backup.autoNever')}
      </p>

      {error ? (
        <p className="settings-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="settings-actions">
        <Button variant="primary" disabled={!dirty || saving} onClick={onSave}>
          {saving ? t('settings.saving') : t('settings.backup.autoSave')}
        </Button>
        <Button variant="secondary" disabled={running} onClick={onRunNow}>
          {running ? t('settings.backup.autoRunning') : t('settings.backup.autoRunNow')}
        </Button>
      </div>

      {overview.items.length === 0 ? (
        <EmptyState
          illustration={<Icon name="calendar" size={32} />}
          title={t('settings.backup.autoEmptyTitle')}
          description={t('settings.backup.autoEmptyHint')}
        />
      ) : (
        <ul className="settings-list">
          {overview.items.map((snapshot) => (
            <li key={snapshot.id} className="settings-row">
              <div className="settings-row__main">
                <span className="settings-row__title">{snapshot.filename}</span>
                <span className="settings-row__meta">
                  {snapshot.createdAt.slice(0, 16).replace('T', ' ')} ·{' '}
                  {t('settings.backup.autoSize', {
                    kb: Math.max(1, Math.round(snapshot.sizeBytes / 1024)),
                  })}
                </span>
              </div>
              <div className="settings-row__actions">
                <Button variant="secondary" size="sm" onClick={() => onDownload(snapshot)}>
                  {t('settings.backup.autoDownload')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export interface BackupViewProps {
  items: ContentSummary[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  exporting: boolean;
  onReload: () => void;
  onRestore: (item: ContentSummary) => void;
  onPurge: (item: ContentSummary) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

/**
 * "Backup & ประวัติเวอร์ชัน" (docs/design/05-admin-ia.md 5.1). Exports the whole
 * site to one file, restores from a file, explains where version history lives,
 * and collects everything in the trash with the days left before the auto-purge.
 */
export const BackupView = ({
  items,
  loading,
  error,
  busy,
  exporting,
  onReload,
  onRestore,
  onPurge,
  onExport,
  onImport,
}: BackupViewProps) => {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="settings-panel">
      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.backup.exportTitle')}</h2>
        <div className="settings-backup-actions">
          <div className="settings-backup-action">
            <span className="settings-backup-action__icon" aria-hidden="true">
              <Icon name="download" size={20} />
            </span>
            <div className="settings-backup-action__body">
              <p className="settings-backup-action__title">{t('settings.backup.export')}</p>
              <p className="settings-backup-action__hint">{t('settings.backup.exportTileHint')}</p>
            </div>
            <Button variant="primary" disabled={exporting} onClick={onExport}>
              {exporting ? t('settings.backup.exporting') : t('settings.backup.downloadFile')}
            </Button>
          </div>

          <div className="settings-backup-action">
            <span className="settings-backup-action__icon" aria-hidden="true">
              <Icon name="upload" size={20} />
            </span>
            <div className="settings-backup-action__body">
              <p className="settings-backup-action__title">{t('settings.backup.import')}</p>
              <p className="settings-backup-action__hint">{t('settings.backup.importHint')}</p>
            </div>
            <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? t('settings.backup.importing') : t('settings.backup.chooseFile')}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.target.value = '';
              }}
            />
          </div>
        </div>
      </Card>

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.backup.historyTitle')}</h2>
        <p className="settings-card__hint">{t('settings.backup.historyHint')}</p>
      </Card>

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.backup.trashTitle')}</h2>
        <p className="settings-card__hint">
          {t('settings.backup.trashHint', { days: CONTENT_TRASH_RETENTION_DAYS })}
        </p>

        {loading ? (
          <Skeleton shape="block" height={160} />
        ) : error ? (
          <EmptyState
            tone="error"
            title={t('settings.backup.trashLoadError')}
            description={error}
            action={
              <Button variant="secondary" onClick={onReload}>
                {t('common.retry')}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustration={<Icon name="database" size={32} />}
            title={t('settings.backup.trashEmpty')}
            description={t('settings.backup.trashEmptyHint')}
          />
        ) : (
          <ul className="settings-list">
            {items.map((item) => (
              <li key={item.id} className="settings-row">
                <div className="settings-row__main">
                  <span className="settings-row__title">{item.title}</span>
                  <span className="settings-row__meta">
                    {t('settings.backup.rowMeta', {
                      kind: t(TYPE_LABEL_KEYS[item.type]),
                      slug: item.slug,
                      days: trashDaysLeft(item.archivedAt),
                    })}
                  </span>
                </div>
                <div className="settings-row__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => onRestore(item)}
                  >
                    {t('content.restore')}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => onPurge(item)}>
                    {t('content.purge')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const BackupTab = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState<ContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingPurge, setPendingPurge] = useState<ContentSummary | null>(null);
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [schedule, setSchedule] = useState<BackupScheduleInput>({
    enabled: false,
    hour: 3,
    retentionDays: 14,
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trash, loadedOverview] = await Promise.all([api.listTrash(), api.getBackupOverview()]);
      setItems(trash);
      setOverview(loadedOverview);
      setSchedule({
        enabled: loadedOverview.schedule.enabled,
        hour: loadedOverview.schedule.hour,
        retentionDays: loadedOverview.schedule.retentionDays,
      });
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (item: ContentSummary): Promise<void> => {
    setBusy(true);
    try {
      await api.restoreFromTrash(item.id);
      toast.push({
        tone: 'success',
        title: t('settings.backup.restored'),
        description: t('settings.backup.restoredBody'),
      });
      await load();
    } catch (restoreError) {
      toast.push({ tone: 'danger', title: messageOf(restoreError) });
    } finally {
      setBusy(false);
    }
  };

  const purge = async (item: ContentSummary): Promise<void> => {
    setBusy(true);
    try {
      await api.purgeFromTrash(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.push({
        tone: 'danger',
        title: t('settings.backup.purged'),
        description: item.title,
      });
    } catch (purgeError) {
      toast.push({ tone: 'danger', title: messageOf(purgeError) });
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = async (): Promise<void> => {
    setExporting(true);
    try {
      const file = await api.exportBackup();
      downloadFile(file.filename, file.content);
      toast.push({ tone: 'success', title: t('settings.backup.downloaded') });
    } catch (exportError) {
      toast.push({ tone: 'danger', title: messageOf(exportError) });
    } finally {
      setExporting(false);
    }
  };

  const importBackup = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as SiteImportInput;
      const result: SiteImportResult = await api.importBackup(parsed);
      toast.push({
        tone: 'success',
        title: t('settings.backup.imported'),
        description: `${t('settings.backup.importSummary', {
          added: result.contents.added,
          skipped: result.contents.skipped,
        })}${result.media.added > 0 ? ` · ${t('settings.backup.importMedia', { count: result.media.added })}` : ''}${result.domains.added > 0 ? ` · ${t('settings.backup.importDomains', { count: result.domains.added })}` : ''}${result.members.added > 0 ? ` · ${t('settings.backup.importMembers', { count: result.members.added })}` : ''}${result.products.added > 0 ? ` · ${t('settings.backup.importProducts', { count: result.products.added })}` : ''}${result.orders.added > 0 ? ` · ${t('settings.backup.importOrders', { count: result.orders.added })}` : ''}`,
      });
      await load();
    } catch (importError) {
      toast.push({
        tone: 'danger',
        title:
          importError instanceof SyntaxError
            ? t('settings.backup.invalidFile')
            : messageOf(importError),
      });
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async (): Promise<void> => {
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const updated = await api.updateBackupSchedule(schedule);
      setOverview(updated);
      setSchedule({
        enabled: updated.schedule.enabled,
        hour: updated.schedule.hour,
        retentionDays: updated.schedule.retentionDays,
      });
      toast.push({ tone: 'success', title: t('settings.backup.autoSaved') });
    } catch (saveError) {
      setScheduleError(messageOf(saveError));
    } finally {
      setSavingSchedule(false);
    }
  };

  const runBackup = async (): Promise<void> => {
    setRunningBackup(true);
    setScheduleError(null);
    try {
      await api.createBackupSnapshot();
      setOverview(await api.getBackupOverview());
      toast.push({ tone: 'success', title: t('settings.backup.autoCreated') });
    } catch (runError) {
      setScheduleError(messageOf(runError));
    } finally {
      setRunningBackup(false);
    }
  };

  const downloadSnapshot = async (snapshot: BackupSnapshot): Promise<void> => {
    try {
      const file = await api.downloadBackupSnapshot(snapshot.id);
      downloadFile(file.filename, file.content);
    } catch (downloadError) {
      toast.push({ tone: 'danger', title: messageOf(downloadError) });
    }
  };

  return (
    <>
      {overview ? (
        <BackupScheduleView
          overview={overview}
          enabled={schedule.enabled}
          hour={schedule.hour}
          retentionDays={schedule.retentionDays}
          saving={savingSchedule}
          running={runningBackup}
          error={scheduleError}
          onEnabledChange={(enabled) => setSchedule({ ...schedule, enabled })}
          onHourChange={(hour) => setSchedule({ ...schedule, hour })}
          onRetentionChange={(retentionDays) => setSchedule({ ...schedule, retentionDays })}
          onSave={() => void saveSchedule()}
          onRunNow={() => void runBackup()}
          onDownload={(snapshot) => void downloadSnapshot(snapshot)}
        />
      ) : null}

      <BackupView
        items={items}
        loading={loading}
        error={error}
        busy={busy}
        exporting={exporting}
        onReload={() => void load()}
        onRestore={(item) => void restore(item)}
        onPurge={setPendingPurge}
        onExport={() => void exportBackup()}
        onImport={(file) => void importBackup(file)}
      />

      <Modal
        open={pendingPurge !== null}
        size="sm"
        title={t('content.purgeTitle')}
        description={
          pendingPurge ? t('content.purgeBody', { title: pendingPurge.title }) : undefined
        }
        onClose={() => setPendingPurge(null)}
        footer={
          <div className="settings-actions">
            <Button variant="ghost" onClick={() => setPendingPurge(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = pendingPurge;
                setPendingPurge(null);
                if (target) void purge(target);
              }}
            >
              {t('content.purge')}
            </Button>
          </div>
        }
      />
    </>
  );
};

/**
 * Settings (05-admin-ia.md 5.1): one door in the sidebar, the tabs here are the
 * only sub-navigation, and only the tabs this role may open are offered.
 */
export const SettingsPage = ({
  api,
  billing,
  tab,
  onNavigate,
  role,
  features,
  security,
  apiKeys,
  agency,
  demo = false,
}: SettingsPageProps) => {
  const t = useT();
  const openTabs = allowedTabs('settings', SETTINGS_TABS, role, features);

  return (
    <div className="settings-page">
      <PageHeader
        eyebrow={t('nav.section.site')}
        title={t('nav.settings')}
        description={t('settings.subtitle')}
        tabs={
          <Tabs
            className="settings-tabs"
            items={TABS.filter((item) => openTabs.includes(item.id)).map((item) => ({
              id: item.id,
              label: t(item.labelKey),
            }))}
            value={tab}
            onChange={(id) => onNavigate(`/settings/${id}`)}
          />
        }
      />

      {tab === 'general' ? (
        <>
          <GeneralTab api={api} />
          {security ? <SecurityPanel api={security} /> : null}
        </>
      ) : null}
      {tab === 'language' ? <LanguageTab api={api} /> : null}
      {tab === 'domain' ? <DomainTab api={api} /> : null}
      {tab === 'redirects' ? <RedirectsTab api={api} /> : null}
      {tab === 'team' ? <TeamTab api={api} /> : null}
      {tab === 'backup' ? <BackupTab api={api} /> : null}
      {tab === 'email' ? <EmailPanel api={api} /> : null}
      {tab === 'publish' ? <PublishPanel api={api} /> : null}
      {tab === 'features' ? <FeaturesPanel api={api} /> : null}
      {tab === 'billing' ? <BillingPanel api={billing} /> : null}
      {tab === 'api-keys' && apiKeys ? (
        <ApiKeysPanel api={apiKeys} canManage={role === 'owner' || role === 'admin'} demo={demo} />
      ) : null}
      {tab === 'branding' && agency ? (
        <BrandingPanel api={agency} canManage={role === 'owner'} />
      ) : null}
    </div>
  );
};

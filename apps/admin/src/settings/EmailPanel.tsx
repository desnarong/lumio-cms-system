import { useEffect, useState } from 'react';
import {
  emailSettingsInputSchema,
  type EmailProvider,
  type EmailSettingsInput,
  type EmailSettingsView as EmailSettingsViewData,
  type EmailTestResult,
} from '@lumio/shared';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Select,
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

/** Splits the comma list a person naturally types into addresses. */
export const parseRecipients = (value: string): string[] =>
  value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 5);

export interface EmailViewProps {
  settings: EmailSettingsViewData;
  draft: EmailSettingsInput;
  password: string;
  apiKey: string;
  recipients: string;
  testTo: string;
  saving: boolean;
  testing: boolean;
  error: string | null;
  testMessage: string | null;
  onDraftChange: (draft: EmailSettingsInput) => void;
  onPasswordChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onRecipientsChange: (value: string) => void;
  onTestToChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
}

const providerOptions = (smtp: string, resend: string) => [
  { value: 'smtp', label: smtp },
  { value: 'resend', label: resend },
];

/**
 * "ตั้งค่า › อีเมล" (docs/design/03-scope.md "ฟอร์มติดต่อ + แจ้งเตือน Email").
 * The owner connects their own mailbox here; a test message proves it works
 * before the first visitor writes in.
 */
export const EmailView = ({
  settings,
  draft,
  password,
  apiKey,
  recipients,
  testTo,
  saving,
  testing,
  error,
  testMessage,
  onDraftChange,
  onPasswordChange,
  onApiKeyChange,
  onRecipientsChange,
  onTestToChange,
  onSave,
  onTest,
}: EmailViewProps) => {
  const t = useT();
  const smtp = draft.smtp ?? { host: '', port: 465, secure: true, username: '' };

  return (
    <div className="settings-panel">
      {settings.ready ? (
        <Banner tone="success" title={t('settings.email.ready')}>
          {t('settings.email.readyBody')}
        </Banner>
      ) : (
        <Banner tone="warning" title={t('settings.email.notReady')}>
          {settings.platformReady
            ? t('settings.email.fallbackBody')
            : t('settings.email.notReadyBody')}
        </Banner>
      )}

      <Card className="settings-card">
        <h2 className="settings-card__title">{t('settings.email.title')}</h2>
        <p className="settings-card__hint">{t('settings.email.hint')}</p>

        <Switch
          label={t('settings.email.enabled')}
          description={t('settings.email.enabledHint')}
          checked={draft.enabled}
          onChange={(enabled) => onDraftChange({ ...draft, enabled })}
        />

        <Select
          label={t('settings.email.provider')}
          options={providerOptions(t('settings.email.providerSmtp'), t('settings.email.providerResend'))}
          value={draft.provider}
          onChange={(event) =>
            onDraftChange({ ...draft, provider: event.target.value as EmailProvider })
          }
        />

        <div className="settings-inline">
          <TextField
            label={t('settings.email.fromName')}
            placeholder={t('settings.email.fromNamePlaceholder')}
            value={draft.fromName}
            onChange={(event) => onDraftChange({ ...draft, fromName: event.target.value })}
          />
          <TextField
            label={t('settings.email.fromEmail')}
            type="email"
            placeholder="hello@yourbrand.com"
            value={draft.fromEmail}
            onChange={(event) => onDraftChange({ ...draft, fromEmail: event.target.value })}
          />
        </div>

        <TextField
          label={t('settings.email.recipients')}
          hint={t('settings.email.recipientsHint')}
          placeholder="owner@yourbrand.com, team@yourbrand.com"
          value={recipients}
          onChange={(event) => onRecipientsChange(event.target.value)}
        />

        {draft.provider === 'smtp' ? (
          <>
            <div className="settings-inline">
              <TextField
                label={t('settings.email.smtpHost')}
                placeholder="smtp.yourbrand.com"
                value={smtp.host}
                onChange={(event) =>
                  onDraftChange({ ...draft, smtp: { ...smtp, host: event.target.value } })
                }
              />
              <TextField
                label={t('settings.email.smtpPort')}
                type="number"
                value={String(smtp.port)}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    smtp: { ...smtp, port: Number(event.target.value) || 465 },
                  })
                }
              />
            </div>
            <Switch
              label={t('settings.email.smtpSecure')}
              description={t('settings.email.smtpSecureHint')}
              checked={smtp.secure}
              onChange={(secure) => onDraftChange({ ...draft, smtp: { ...smtp, secure } })}
            />
            <div className="settings-inline">
              <TextField
                label={t('settings.email.smtpUsername')}
                placeholder="hello@yourbrand.com"
                value={smtp.username}
                onChange={(event) =>
                  onDraftChange({ ...draft, smtp: { ...smtp, username: event.target.value } })
                }
              />
              <TextField
                label={t('settings.email.smtpPassword')}
                type="password"
                hint={settings.smtp.hasPassword ? t('settings.email.secretSaved') : undefined}
                placeholder={settings.smtp.hasPassword ? '••••••••' : ''}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
            </div>
          </>
        ) : (
          <TextField
            label={t('settings.email.resendKey')}
            type="password"
            hint={
              settings.resend.hasApiKey ? t('settings.email.secretSaved') : t('settings.email.resendHint')
            }
            placeholder={settings.resend.hasApiKey ? '••••••••' : 're_...'}
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
        )}

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
        <h2 className="settings-card__title">{t('settings.email.testTitle')}</h2>
        <p className="settings-card__hint">{t('settings.email.testHint')}</p>
        <div className="settings-inline">
          <TextField
            label={t('settings.email.testTo')}
            type="email"
            placeholder="you@yourbrand.com"
            value={testTo}
            onChange={(event) => onTestToChange(event.target.value)}
          />
          <Button
            variant="secondary"
            disabled={testing || testTo.trim().length === 0}
            onClick={onTest}
          >
            {testing ? t('settings.email.testing') : t('settings.email.test')}
          </Button>
        </div>
        {testMessage ? (
          <p className="settings-hint" role="status">
            {testMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
};

const draftFrom = (settings: EmailSettingsViewData): EmailSettingsInput => ({
  enabled: settings.enabled,
  provider: settings.provider,
  fromName: settings.fromName,
  fromEmail: settings.fromEmail,
  notifyEmails: settings.notifyEmails,
  smtp: {
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    username: settings.smtp.username,
  },
  resend: {},
});

export const EmailPanel = ({ api }: { api: SettingsApi }) => {
  const t = useT();
  const toast = useToast();
  const [settings, setSettings] = useState<EmailSettingsViewData | null>(null);
  const [draft, setDraft] = useState<EmailSettingsInput | null>(null);
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [recipients, setRecipients] = useState('');
  const [testTo, setTestTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .getEmailSettings()
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setDraft(draftFrom(loaded));
        setRecipients(loaded.notifyEmails.join(', '));
        setTestTo(loaded.notifyEmails[0] ?? '');
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
        title={t('settings.email.loadError')}
        description={error ?? t('common.genericError')}
      />
    );
  }

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const input = emailSettingsInputSchema.parse({
        ...draft,
        notifyEmails: parseRecipients(recipients),
        smtp:
          draft.provider === 'smtp'
            ? {
                ...draft.smtp,
                ...(password.trim().length > 0 ? { password: password.trim() } : {}),
              }
            : undefined,
        resend: draft.provider === 'resend' && apiKey.trim().length > 0 ? { apiKey: apiKey.trim() } : {},
      });
      const updated = await api.updateEmailSettings(input);
      setSettings(updated);
      setDraft(draftFrom(updated));
      setPassword('');
      setApiKey('');
      setRecipients(updated.notifyEmails.join(', '));
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
      const result: EmailTestResult = await api.testEmail(testTo.trim());
      setTestMessage(result.message);
      toast.push({ tone: result.sent ? 'success' : 'danger', title: result.message });
    } catch (testError) {
      setTestMessage(messageOf(testError));
      toast.push({ tone: 'danger', title: messageOf(testError) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <EmailView
      settings={settings}
      draft={draft}
      password={password}
      apiKey={apiKey}
      recipients={recipients}
      testTo={testTo}
      saving={saving}
      testing={testing}
      error={error}
      testMessage={testMessage}
      onDraftChange={setDraft}
      onPasswordChange={setPassword}
      onApiKeyChange={setApiKey}
      onRecipientsChange={setRecipients}
      onTestToChange={setTestTo}
      onSave={() => void save()}
      onTest={() => void test()}
    />
  );
};

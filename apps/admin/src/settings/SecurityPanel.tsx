import { useCallback, useEffect, useState } from 'react';
import type { TwoFactorSetup, TwoFactorStatus } from '@lumio/shared';
import { Banner, Button, Card, Skeleton, TextField, useT } from '@lumio/ui';
import type { AuthApi } from '../auth/api.js';
import { messageOf } from './SettingsPage.js';

export interface SecurityPanelProps {
  api: AuthApi;
}

/**
 * "ความยืนยันตัวตนสองขั้น" (docs/design/15-security.md). Setup shows the shared
 * secret and its otpauth URI, which an authenticator app imports (or encodes as a
 * QR); the first valid code turns it on and reveals the recovery codes once.
 */
export const SecurityPanel = ({ api }: SecurityPanelProps) => {
  const t = useT();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await api.twoFactorStatus());
    } catch (loadError) {
      setError(messageOf(loadError));
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setSetup(await api.startTwoFactor());
      setRecoveryCodes([]);
      setCode('');
    } catch (startError) {
      setError(messageOf(startError));
    } finally {
      setBusy(false);
    }
  };

  const enable = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.enableTwoFactor(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode('');
      await load();
    } catch (enableError) {
      setError(messageOf(enableError));
    } finally {
      setBusy(false);
    }
  };

  const disable = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await api.disableTwoFactor(password, code.trim()));
      setRecoveryCodes([]);
      setPassword('');
      setCode('');
    } catch (disableError) {
      setError(messageOf(disableError));
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <Card className="settings-card">
        <h2 className="settings-card__title">{t('security.title')}</h2>
        <Skeleton shape="text" lines={2} />
      </Card>
    );
  }

  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">{t('security.title')}</h2>
      <p className="settings-row__meta">{t('security.subtitle')}</p>

      {error ? <Banner tone="danger" title={error} /> : null}

      {status.enabled ? (
        <>
          <p className="security-state" role="status">
            {t('security.enabled', { count: status.recoveryCodesLeft })}
          </p>

          {recoveryCodes.length > 0 ? (
            <div className="security-recovery">
              <p className="settings-row__meta">{t('security.recoveryOnce')}</p>
              <ul className="security-recovery__list">
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode}>
                    <code>{recoveryCode}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <TextField
            label={t('security.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label={t('security.code')}
            hint={t('security.codeHint')}
            inputMode="numeric"
            maxLength={9}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <div className="settings-row__actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || password.length === 0 || code.trim().length < 6}
              onClick={() => void disable()}
            >
              {t('security.disable')}
            </Button>
          </div>
        </>
      ) : setup ? (
        <>
          <p className="settings-row__meta">{t('security.setupHint')}</p>
          <p className="security-secret">
            <span className="settings-row__meta">{t('security.secret')}</span>
            <code data-testid="totp-secret">{setup.secret}</code>
          </p>
          <p className="settings-row__meta">
            {t('security.otpauth')}{' '}
            <a className="security-secret__link" href={setup.otpauthUrl}>
              {t('security.otpauthOpen')}
            </a>
          </p>
          <TextField
            label={t('security.code')}
            hint={t('security.setupCodeHint')}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <div className="settings-row__actions">
            <Button
              size="sm"
              disabled={busy || code.trim().length !== 6}
              onClick={() => void enable()}
            >
              {t('security.confirm')}
            </Button>
          </div>
        </>
      ) : (
        <div className="settings-row__actions">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void start()}>
            {t('security.start')}
          </Button>
        </div>
      )}
    </Card>
  );
};

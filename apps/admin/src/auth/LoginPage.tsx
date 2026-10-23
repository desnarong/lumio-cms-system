import { useState, type FormEvent } from 'react';
import { isTwoFactorChallenge, loginInputSchema, type TwoFactorChallenge } from '@lumio/shared';
import { Banner, Button, Card, Icon, TextField, useT } from '@lumio/ui';
import type { AuthApi, SignInResult } from './api.js';

export interface LoginPageProps {
  api: AuthApi;
  onSignedIn: (session: SignInResult) => void;
  /** Shown under the form in demo mode, where no API is configured. */
  hint?: string;
  /** Why the user is back on this screen, e.g. an expired session. */
  notice?: string;
}

/** The second step of sign-in, kept separate so it renders (and tests) plainly. */
export interface TwoFactorFormProps {
  code: string;
  busy: boolean;
  error: string | null;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const TwoFactorForm = ({
  code,
  busy,
  error,
  onCodeChange,
  onSubmit,
  onBack,
}: TwoFactorFormProps) => {
  const t = useT();

  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <p className="auth-eyebrow">
          <span className="auth-logo" aria-hidden="true">
            <Icon name="sparkles" size={16} />
          </span>
          Lumio
        </p>
        <h1 className="auth-title">{t('auth.twoFactorTitle')}</h1>
        <p className="auth-subtitle">{t('auth.twoFactorSubtitle')}</p>

        {error ? <Banner tone="danger" title={error} /> : null}

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <TextField
            id="login-code"
            label={t('auth.twoFactorCode')}
            hint={t('auth.twoFactorHint')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            required
          />
          <Button type="submit" size="lg" disabled={busy || code.trim().length < 6}>
            {busy ? t('auth.busy') : t('auth.twoFactorSubmit')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy}>
            {t('auth.twoFactorBack')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

/**
 * Sign-in for the admin (the API has been ready since the auth milestone).
 * One primary button, business language, and the reason it failed spelled out
 * (docs/design/04-ux.md 4.5). Accounts with two-factor sign-in continue on a
 * second step before a session exists.
 */
export const LoginPage = ({ api, onSignedIn, hint, notice }: LoginPageProps) => {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const parsed = loginInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('auth.invalid'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await api.login(parsed.data);
      if (isTwoFactorChallenge(result)) {
        setChallenge(result);
        setCode('');
        return;
      }
      onSignedIn(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('auth.failed'));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (): Promise<void> => {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await api.verifyTwoFactor(challenge.challengeToken, code.trim()));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('auth.twoFactorWrong'));
    } finally {
      setBusy(false);
    }
  };

  if (challenge) {
    return (
      <TwoFactorForm
        code={code}
        busy={busy}
        error={error}
        onCodeChange={setCode}
        onSubmit={() => void submitCode()}
        onBack={() => {
          setChallenge(null);
          setCode('');
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <p className="auth-eyebrow">
          <span className="auth-logo" aria-hidden="true">
            <Icon name="sparkles" size={16} />
          </span>
          Lumio
        </p>
        <h1 className="auth-title">{t('auth.title')}</h1>
        <p className="auth-subtitle">{t('auth.subtitle')}</p>

        {notice ? <Banner tone="warning" title={notice} /> : null}
        {error ? <Banner tone="danger" title={error} /> : null}

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <TextField
            id="login-email"
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <TextField
            id="login-password"
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? t('auth.busy') : t('auth.submit')}
          </Button>
        </form>

        {hint ? <p className="auth-hint">{hint}</p> : null}
      </Card>
    </div>
  );
};

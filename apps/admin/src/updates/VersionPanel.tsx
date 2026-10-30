import { useCallback, useEffect, useState } from 'react';
import { Icon, useT } from '@lumio/ui';
import { buildUpdateStatus, type UpdateStatus } from '@lumio/shared';
import type { UpdatesApi } from './api.js';
import { buildVersion } from './version.js';

/** How often the shell re-reads the cached status; the API does the real check. */
export const VERSION_POLL_MS = 15 * 60_000;

export interface VersionSummaryProps {
  status: UpdateStatus;
  checking?: boolean;
  onCheck?: () => void;
}

/**
 * Version this deployment runs, plus the notice when a newer release exists
 * (docs/design/18-deployment.md 18.8). The current version is shown on every
 * screen, so an operator can answer "which version is this?" without digging.
 */
export const VersionSummary = ({ status, checking = false, onCheck }: VersionSummaryProps) => {
  const t = useT();
  const latest = status.latestVersion;

  return (
    <div className="shell-version">
      <span className="shell-version__row">
        <span className="shell-version__icon" aria-hidden="true">
          <Icon name={status.updateAvailable ? 'arrow-up' : 'check'} size={14} />
        </span>
        <span className="shell-version__label">
          {t('updates.current', { version: status.currentVersion })}
        </span>
        {onCheck ? (
          <button
            type="button"
            className="shell-version__check"
            aria-label={t('updates.check')}
            title={t('updates.check')}
            disabled={checking}
            onClick={onCheck}
          >
            <Icon name="refresh" size={14} />
          </button>
        ) : null}
      </span>

      {status.updateAvailable && latest ? (
        <div className="shell-version__notice" role="status">
          <p className="shell-version__new">{t('updates.available', { version: latest })}</p>
          <p className="shell-version__hint">
            {t('updates.hint', { current: status.currentVersion, latest })}
          </p>
          {status.releaseUrl ? (
            <a
              className="shell-version__link"
              href={status.releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('updates.notes')}
              <Icon name="external-link" size={12} />
            </a>
          ) : null}
          <p className="shell-version__how">
            {status.autoUpdate ? t('updates.autoOn') : t('updates.manual')}
          </p>
        </div>
      ) : null}

      {status.error && !status.updateAvailable ? (
        <p className="shell-version__error">{t('updates.unavailable')}</p>
      ) : null}
    </div>
  );
};

export interface VersionPanelProps {
  api: UpdatesApi;
  /** Poll interval; tests set it to zero to disable the timer. */
  pollMs?: number;
}

/** Loads the status once, then keeps it fresh while the admin stays open. */
export const VersionPanel = ({ api, pollMs = VERSION_POLL_MS }: VersionPanelProps) => {
  // Start from the build's own version so "which version is this?" is answered
  // immediately, even before the API responds (or when it is unreachable).
  const [status, setStatus] = useState<UpdateStatus>(() => buildUpdateStatus(buildVersion()));
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    void api
      .status()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => undefined);

    if (pollMs <= 0) {
      return () => {
        active = false;
      };
    }

    const timer = setInterval(() => {
      void api
        .status()
        .then((next) => {
          if (active) setStatus(next);
        })
        .catch(() => undefined);
    }, pollMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, pollMs]);

  const check = useCallback(() => {
    setChecking(true);
    void api
      .check()
      .then(setStatus)
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, [api]);

  return <VersionSummary status={status} checking={checking} onCheck={check} />;
};

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  seoMetaCandidates,
  type NotFoundList,
  type SeoCheck,
  type SeoGrade,
  type SeoHealth,
} from '@lumio/shared';
import { Icon, Button, Card, Skeleton, useT, type MessageKey } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { ApiError } from '../api-error.js';
import { HealthRing } from '../dashboard/DashboardPage.js';
import type { SeoApi } from './api.js';
import { SeoMetaAssistant } from './SeoMetaAssistant.js';

const GRADE_LABEL_KEYS: Record<SeoGrade, MessageKey> = {
  good: 'seoGrade.good',
  ok: 'seoGrade.ok',
  poor: 'seoGrade.poor',
};

export interface SeoViewProps {
  health: SeoHealth | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (path: string) => void;
  /** The assistant card, so the report offers to write the missing meta text. */
  metaAssistant?: ReactNode;
  /** Addresses visitors tried in the last 30 days that no page answered. */
  brokenLinks?: NotFoundList | null;
}

const CheckRow = ({
  check,
  onNavigate,
}: {
  check: SeoCheck;
  onNavigate: (path: string) => void;
}) => (
  <li className={cn('seo-check', check.done && 'seo-check--done')}>
    <div className="seo-check__head">
      <span className="seo-check__mark" aria-hidden="true">
        {check.done ? <Icon name="check" size={16} /> : <Icon name="circle" size={16} />}
      </span>
      <span className="seo-check__label">{check.label}</span>
      {!check.done ? (
        <span className={cn('seo-check__count', `seo-check__count--${check.impact}`)}>
          {check.count}
        </span>
      ) : null}
    </div>
    {check.items.length > 0 ? (
      <ul className="seo-check__items">
        {check.items.map((item) => (
          <li key={item.id}>
            <a
              className="seo-check__link"
              href={check.href}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(check.href);
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    ) : null}
  </li>
);

/**
 * SEO report (docs/design/05-admin-ia.md "เติบโต › SEO", 14-seo-performance.md
 * 14.1). Shows the score plus every check, and each check leads to where it is fixed.
 */
export const SeoView = ({
  health,
  loading,
  error,
  onRetry,
  onNavigate,
  metaAssistant,
  brokenLinks,
}: SeoViewProps) => {
  const t = useT();

  if (loading && !health) {
    return (
      <div className="growth">
        <Skeleton shape="block" height={120} />
        <Skeleton shape="text" lines={5} />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="growth">
        <p className="growth__inline-error" role="alert">
          {error ?? t('seo.loadError')}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {t('growth.retry')}
        </Button>
      </div>
    );
  }

  const failing = health.checks.filter((check) => !check.done);

  return (
    <div className="growth">
      <header className="growth__header">
        <h1 className="growth__title">{t('nav.seo')}</h1>
        <p className="growth__subtitle">{t('seo.subtitle')}</p>
      </header>

      {error ? (
        <p className="growth__inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="seo-score">
        <HealthRing score={health.score} />
        <div className="seo-score__body">
          <p className="seo-score__grade">{t(GRADE_LABEL_KEYS[health.grade])}</p>
          <p className="seo-score__hint">
            {failing.length === 0 ? t('seo.allGood') : t('seo.failing', { count: failing.length })}
          </p>
          <p className="seo-score__published">
            {t('seo.published', { count: health.publishedCount })}
          </p>
        </div>
      </Card>

      <Card className="seo-checks">
        <h2 className="growth__card-title">{t('seo.checks')}</h2>
        <ul className="seo-checks__list">
          {health.checks.map((check) => (
            <CheckRow key={check.kind} check={check} onNavigate={onNavigate} />
          ))}
        </ul>
      </Card>

      {brokenLinks ? (
        <Card className="seo-checks">
          <h2 className="growth__card-title">{t('seo.notFoundTitle')}</h2>
          <p className="growth__card-hint">{t('seo.notFoundHint')}</p>
          {brokenLinks.items.length === 0 ? (
            <p className="growth__card-hint">{t('seo.notFoundEmpty')}</p>
          ) : (
            <ul className="seo-checks__list">
              {brokenLinks.items.map((entry) => (
                <li key={entry.path} className="seo-check">
                  <div className="seo-check__head">
                    <span className="seo-check__mark" aria-hidden="true">
                      <Icon name="alert-circle" size={14} />
                    </span>
                    <span className="seo-check__label">{entry.path}</span>
                    <span className="seo-check__count seo-check__count--high">
                      {t('seo.notFoundHits', { hits: entry.hits })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onClick={() => onNavigate('/settings/redirects')}>
            {t('seo.notFoundFix')}
          </Button>
        </Card>
      ) : null}

      {metaAssistant}
    </div>
  );
};

export interface SeoPageProps {
  api: SeoApi;
  onNavigate: (path: string) => void;
  /** Writing meta text needs a content-write role. */
  canManage?: boolean;
}

export const SeoPage = ({ api, onNavigate, canManage = true }: SeoPageProps) => {
  const t = useT();
  const [health, setHealth] = useState<SeoHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brokenLinks, setBrokenLinks] = useState<NotFoundList | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedHealth, loadedBroken] = await Promise.all([
        api.getHealth(),
        api.getNotFound().catch(() => null),
      ]);
      setHealth(loadedHealth);
      setBrokenLinks(loadedBroken);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SeoView
      health={health}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      onNavigate={onNavigate}
      brokenLinks={brokenLinks}
      metaAssistant={
        health ? (
          <SeoMetaAssistant
            api={api}
            candidates={seoMetaCandidates(health)}
            canManage={canManage}
            onApplied={load}
          />
        ) : null
      }
    />
  );
};

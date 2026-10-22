import type { ContentType, DashboardMetric, DashboardSummary, SiteHealthIssue } from '@lumio/shared';
import { Button, Card, EmptyState, Skeleton, StatCard, useT, type Translate } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import type { DashboardApi } from './api.js';
import { useDashboard } from './useDashboard.js';

export interface DashboardPageProps {
  api: DashboardApi;
  /** Opens the shared "new page / new post" dialog. */
  onCreate: (kind: ContentType) => void;
  onOpenEditor: (contentId: string) => void;
  onNavigate: (path: string) => void;
}

const numberFormat = new Intl.NumberFormat('th-TH');

const trendOf = (metric: DashboardMetric): 'up' | 'down' | 'flat' => {
  if (metric.changePercent === null || metric.changePercent === 0) return 'flat';
  return metric.changePercent > 0 ? 'up' : 'down';
};

const deltaOf = (metric: DashboardMetric, t: Translate): string => {
  if (metric.changePercent === null) return t('dashboard.versusYesterday');
  const sign = metric.changePercent > 0 ? '+' : '';
  return t('dashboard.versusYesterdayChange', { delta: `${sign}${metric.changePercent}` });
};

export const HealthRing = ({ score }: { score: number }) => {
  const t = useT();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="health-ring" role="img" aria-label={t('dashboard.healthScore', { score })}>
      <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
        <circle className="health-ring__track" cx="50" cy="50" r={radius} />
        <circle
          className="health-ring__value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span className="health-ring__score">{score}</span>
    </div>
  );
};

const IssueLink = ({
  issue,
  onNavigate,
}: {
  issue: SiteHealthIssue;
  onNavigate: (path: string) => void;
}) => (
  <li className="health-issues__item">
    <a
      className={cn('health-issues__link', `health-issues__link--${issue.impact}`)}
      href={issue.href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(issue.href);
      }}
    >
      <span className="health-issues__dot" aria-hidden="true" />
      <span>{issue.message}</span>
      <span className="health-issues__go" aria-hidden="true">
        ›
      </span>
    </a>
  </li>
);

export interface DashboardViewProps {
  summary: DashboardSummary;
  error: string | null;
  onCreate: (kind: ContentType) => void;
  onOpenEditor: (contentId: string) => void;
  onNavigate: (path: string) => void;
  onDismissChecklist: () => void;
}

/**
 * The dashboard cards (docs/design/05-admin-ia.md 5.2): shortcuts, today's numbers
 * with a trend, the site health score with three things to fix, and the onboarding
 * checklist. Every card leads somewhere.
 */
export const DashboardView = ({
  summary,
  error,
  onCreate,
  onOpenEditor,
  onNavigate,
  onDismissChecklist,
}: DashboardViewProps) => {
  const t = useT();
  const { site, stats, health, checklist } = summary;
  const showChecklist = !checklist.complete && !checklist.dismissed;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">{t('dashboard.title')}</h1>
        <p className="dashboard__subtitle">{t('dashboard.subtitleOf', { site: site.name })}</p>
      </header>

      {error ? (
        <p className="dashboard__inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dashboard__shortcuts">
        <Button
          variant="primary"
          disabled={!site.homeContentId}
          onClick={() => site.homeContentId && onOpenEditor(site.homeContentId)}
        >
          {t('dashboard.editSite')}
        </Button>
        <Button variant="secondary" onClick={() => onCreate('page')}>
          {t('dashboard.newPage')}
        </Button>
        <Button variant="secondary" onClick={() => onCreate('post')}>
          {t('dashboard.newPost')}
        </Button>
        <a className="dashboard__view-site" href={site.url} target="_blank" rel="noreferrer">
          {t('dashboard.viewSite')}
        </a>
      </div>

      <div className="dashboard__stats">
        <StatCard
          label={t('dashboard.visitors')}
          value={numberFormat.format(stats.visitors.value)}
          trend={trendOf(stats.visitors)}
          delta={deltaOf(stats.visitors, t)}
        />
        <StatCard
          label={t('dashboard.submissions')}
          value={numberFormat.format(stats.submissions.value)}
          trend={trendOf(stats.submissions)}
          delta={deltaOf(stats.submissions, t)}
        />
        <StatCard
          label={t('dashboard.subscribers')}
          value={numberFormat.format(stats.subscribers.value)}
          trend={trendOf(stats.subscribers)}
          delta={deltaOf(stats.subscribers, t)}
        />
      </div>

      <div className="dashboard__columns">
        <Card className="dashboard__card">
          <h2 className="dashboard__card-title">{t('dashboard.health')}</h2>
          <div className="health">
            <HealthRing score={health.score} />
            {health.issues.length > 0 ? (
              <ul className="health-issues">
                {health.issues.map((issue) => (
                  <IssueLink key={issue.id} issue={issue} onNavigate={onNavigate} />
                ))}
              </ul>
            ) : (
              <p className="health__ok">{t('dashboard.healthOk')}</p>
            )}
          </div>
        </Card>

        {showChecklist ? (
          <Card className="dashboard__card">
            <div className="checklist__header">
              <h2 className="dashboard__card-title">
                {t('dashboard.checklistProgress', {
                  done: checklist.doneCount,
                  total: checklist.total,
                })}
              </h2>
              <button type="button" className="checklist__dismiss" onClick={onDismissChecklist}>
                {t('dashboard.hide')}
              </button>
            </div>
            <ul className="checklist">
              {checklist.items.map((item) => (
                <li key={item.key} className="checklist__item">
                  <a
                    className={cn('checklist__link', item.done && 'checklist__link--done')}
                    href={item.href}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(item.href);
                    }}
                  >
                    <span className="checklist__mark" aria-hidden="true">
                      {item.done ? '✓' : '○'}
                    </span>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

/** Loads the dashboard, then hands it to the view. */
export const DashboardPage = ({
  api,
  onCreate,
  onOpenEditor,
  onNavigate,
}: DashboardPageProps) => {
  const t = useT();
  const dashboard = useDashboard(api);

  if (dashboard.loading && !dashboard.summary) {
    return (
      <div className="dashboard" aria-busy="true">
        <Skeleton shape="text" width="30%" />
        <div className="dashboard__shortcuts">
          <Skeleton shape="block" height={44} />
          <Skeleton shape="block" height={44} />
          <Skeleton shape="block" height={44} />
          <Skeleton shape="block" height={44} />
        </div>
        <div className="dashboard__stats">
          <Skeleton shape="block" height={104} />
          <Skeleton shape="block" height={104} />
          <Skeleton shape="block" height={104} />
        </div>
        <Skeleton shape="block" height={180} />
      </div>
    );
  }

  if (!dashboard.summary) {
    return (
      <EmptyState
        tone="error"
        title={t('dashboard.loadError')}
        description={dashboard.error ?? t('dashboard.genericError')}
        action={
          <Button variant="secondary" onClick={() => void dashboard.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <DashboardView
      summary={dashboard.summary}
      error={dashboard.error}
      onCreate={onCreate}
      onOpenEditor={onOpenEditor}
      onNavigate={onNavigate}
      onDismissChecklist={() => void dashboard.dismissChecklist()}
    />
  );
};

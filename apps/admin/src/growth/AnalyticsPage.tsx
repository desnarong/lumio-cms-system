import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AnalyticsRange, AnalyticsRow, AnalyticsSummary } from '@lumio/shared';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Tabs,
  useT,
  type MessageKey,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { AnalyticsApi } from './api.js';

const numberFormat = new Intl.NumberFormat('th-TH');

const RANGE_LABEL_KEYS: Record<AnalyticsRange, MessageKey> = {
  '7d': 'range.7d',
  '30d': 'range.30d',
};

const RANGES: AnalyticsRange[] = ['7d', '30d'];

export interface AnalyticsViewProps {
  summary: AnalyticsSummary | null;
  range: AnalyticsRange;
  loading: boolean;
  error: string | null;
  onRangeChange: (range: AnalyticsRange) => void;
  onRetry: () => void;
  /** Tab strip of the growth screens, rendered inside this screen's header. */
  headerTabs?: ReactNode;
}

const TrendChart = ({ summary }: { summary: AnalyticsSummary }) => {
  const t = useT();
  const max = Math.max(1, ...summary.series.map((point) => point.visitors));
  const label = t('analytics.chartLabel', {
    count: numberFormat.format(summary.visitors),
    range: t(RANGE_LABEL_KEYS[summary.range]),
  });

  return (
    <div className="analytics-chart" role="img" aria-label={label}>
      {summary.series.map((point) => (
        <span
          key={point.date}
          className="analytics-chart__bar"
          style={{ height: `${Math.round((point.visitors / max) * 100)}%` }}
          title={t('analytics.barTitle', {
            date: point.date,
            count: numberFormat.format(point.visitors),
          })}
        />
      ))}
    </div>
  );
};

const BarList = ({ title, rows }: { title: string; rows: AnalyticsRow[] }) => {
  const t = useT();
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <Card className="analytics-panel">
      <h2 className="growth__card-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="analytics-panel__empty">{t('analytics.empty')}</p>
      ) : (
        <ul className="analytics-bars">
          {rows.map((row) => (
            <li key={row.label} className="analytics-bars__row">
              <span className="analytics-bars__label">{row.label}</span>
              <span className="analytics-bars__track" aria-hidden="true">
                <span
                  className="analytics-bars__fill"
                  style={{ width: `${Math.round((row.value / max) * 100)}%` }}
                />
              </span>
              <span className="analytics-bars__value">{numberFormat.format(row.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/**
 * Visitor analytics (docs/design/05-admin-ia.md "เติบโต › Analytics"). Every
 * number has a trend or a share, so the screen is never a single read-only figure.
 */
export const AnalyticsView = ({
  summary,
  range,
  loading,
  error,
  onRangeChange,
  onRetry,
  headerTabs,
}: AnalyticsViewProps) => {
  const t = useT();

  const header = (
    <PageHeader
      eyebrow={t('nav.section.site')}
      title={t('nav.analytics')}
      description={t('analytics.subtitle')}
      tabs={headerTabs}
    />
  );

  const rangeTabs = (
    <Tabs
      items={RANGES.map((value) => ({ id: value, label: t(RANGE_LABEL_KEYS[value]) }))}
      value={range}
      onChange={(id) => onRangeChange(id as AnalyticsRange)}
    />
  );

  if (loading && !summary) {
    return (
      <div className="growth">
        {header}
        {rangeTabs}
        <Skeleton shape="block" height={160} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="growth">
        {header}
        {rangeTabs}
        <EmptyState
          tone="error"
          title={error ?? t('analytics.loadError')}
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

  const trend = summary.changePercent === null ? 'flat' : summary.changePercent > 0 ? 'up' : 'down';
  const delta =
    summary.changePercent === null
      ? t('analytics.noPrevious')
      : t('analytics.change', {
          sign: summary.changePercent > 0 ? '+' : '',
          percent: summary.changePercent,
        });

  return (
    <div className="growth">
      {header}
      {error ? (
        <p className="growth__inline-error" role="alert">
          {error}
        </p>
      ) : null}
      {rangeTabs}

      <div className="growth__stats">
        <StatCard
          label={t('analytics.visitors')}
          value={numberFormat.format(summary.visitors)}
          trend={trend}
          delta={delta}
        />
        <StatCard label={t('analytics.pageviews')} value={numberFormat.format(summary.pageviews)} />
      </div>

      <Card className="analytics-panel">
        <h2 className="growth__card-title">{t('analytics.trend')}</h2>
        <TrendChart summary={summary} />
      </Card>

      <div className="growth__columns">
        <BarList title={t('analytics.topPages')} rows={summary.topPages} />
        <BarList title={t('analytics.referrers')} rows={summary.topReferrers} />
        <BarList title={t('analytics.devices')} rows={summary.devices} />
      </div>
    </div>
  );
};

export interface AnalyticsPageProps {
  api: AnalyticsApi;
  /** Tab strip of the growth screens. */
  headerTabs?: ReactNode;
}

export const AnalyticsPage = ({ api, headerTabs }: AnalyticsPageProps) => {
  const t = useT();
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getSummary(range));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [api, range, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AnalyticsView
      summary={summary}
      range={range}
      loading={loading}
      error={error}
      onRangeChange={setRange}
      onRetry={() => void load()}
      {...(headerTabs ? { headerTabs } : {})}
    />
  );
};

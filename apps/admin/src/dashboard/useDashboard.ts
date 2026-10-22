import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardSummary } from '@lumio/shared';
import { translateNow, useUiLocale } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { DashboardApi } from './api.js';

export const dashboardErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

export interface DashboardController {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  dismissChecklist: () => Promise<void>;
}

/**
 * Loads the dashboard in one request (stats, health and checklist are answered
 * together, so the cards appear at once behind skeletons).
 */
export const useDashboard = (api: DashboardApi): DashboardController => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = useUiLocale();
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await apiRef.current.getSummary());
    } catch (loadError) {
      setError(dashboardErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dismissChecklist = useCallback(async () => {
    const previous = summary;
    if (previous) {
      setSummary({ ...previous, checklist: { ...previous.checklist, dismissed: true } });
    }
    try {
      await apiRef.current.setChecklistDismissed(true);
    } catch (dismissError) {
      if (previous) setSummary(previous);
      setError(dashboardErrorMessage(dismissError));
    }
  }, [summary]);

  return { summary, loading, error, reload, dismissChecklist };
};

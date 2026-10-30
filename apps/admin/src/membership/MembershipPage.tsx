import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  formatMembershipPrice,
  intervalLabel,
  type MembershipPlan,
  type MembershipPlanInput,
  type MembershipReader,
  type MembershipReaderList,
  type MembershipSummary,
  type ReaderSubscriptionView,
} from '@lumio/shared';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
  TextField,
  useT,
  useToast,
} from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { MembershipApi } from './api.js';

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const STATUS_KEY: Record<string, string> = {
  active: 'membership.statusPaid',
  past_due: 'membership.statusPastDue',
  cancelled: 'membership.statusCancelled',
  expired: 'membership.statusCancelled',
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '-';
  const [date] = iso.split('T');
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const priceLabel = (plan: MembershipPlan): string =>
  `${formatMembershipPrice(plan.price, plan.currency)} / ${intervalLabel(plan.interval)}`;

export interface MembershipViewProps {
  summary: MembershipSummary | null;
  plans: MembershipPlan[];
  readers: MembershipReaderList | null;
  canManage: boolean;
  /** Tab strip of the growth screens, rendered inside this screen's header. */
  headerTabs?: ReactNode;
  busy: boolean;
  error: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  onAddPlan: () => void;
  onEditPlan: (plan: MembershipPlan) => void;
  onDeletePlan: (plan: MembershipPlan) => void;
  onToggleRenewal: (reader: MembershipReader, cancel: boolean) => void;
}

/**
 * Members and plans of one site (docs/PROGRESS.md batch A). It is a pure view:
 * the container below loads the numbers and owns the dialogs, so the whole
 * table can be rendered in a test without a network.
 */
export const MembershipView = ({
  summary,
  plans,
  readers,
  canManage,
  headerTabs,
  busy,
  error,
  query,
  onQueryChange,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onToggleRenewal,
}: MembershipViewProps) => {
  const t = useT();
  const items = readers?.items ?? [];

  return (
    <div className="growth membership">
      <PageHeader
        eyebrow={t('nav.section.site')}
        title={t('nav.membership')}
        description={t('membership.subtitle')}
        tabs={headerTabs}
      />
      <div className="membership__stats">
        <Card className="membership__stat">
          <span className="membership__stat-label">{t('membership.summaryMembers')}</span>
          <strong className="membership__stat-value">{summary?.activeMembers ?? 0}</strong>
        </Card>
        <Card className="membership__stat">
          <span className="membership__stat-label">{t('membership.summaryReaders')}</span>
          <strong className="membership__stat-value">{summary?.readers ?? 0}</strong>
        </Card>
        <Card className="membership__stat">
          <span className="membership__stat-label">{t('membership.summaryMrr')}</span>
          <strong className="membership__stat-value">
            {formatMembershipPrice(summary?.mrr ?? 0, summary?.currency ?? 'THB')}
          </strong>
        </Card>
      </div>

      {error ? (
        <p className="settings-error" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <header className="membership__head">
          <h2 className="settings-card__title">{t('membership.plansTitle')}</h2>
          {canManage ? (
            <Button type="button" variant="primary" onClick={onAddPlan} disabled={busy}>
              {t('membership.addPlan')}
            </Button>
          ) : null}
        </header>
        {plans.length === 0 ? (
          <EmptyState title={t('membership.plansTitle')} description={t('membership.readersEmpty')} />
        ) : (
          <ul className="settings-list">
            {plans.map((plan) => (
              <li className="settings-row" key={plan.id}>
                <div className="settings-row__main">
                  <strong>{plan.name}</strong>
                  <span className="settings-row__meta">{priceLabel(plan)}</span>
                  {plan.description ? (
                    <span className="settings-row__meta">{plan.description}</span>
                  ) : null}
                </div>
                <div className="settings-row__actions">
                  <span className="membership__badge">
                    {plan.status === 'active'
                      ? t('membership.statusActive')
                      : t('membership.statusPaused')}
                  </span>
                  {canManage ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditPlan(plan)}
                        disabled={busy}
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePlan(plan)}
                        disabled={busy}
                      >
                        {t('membership.deletePlan')}
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <header className="membership__head">
          <h2 className="settings-card__title">{t('membership.readersTitle')}</h2>
          <TextField
            label={t('membership.columnReader')}
            placeholder={t('membership.searchPlaceholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </header>
        {readers === null ? (
          <Skeleton shape="block" height={120} />
        ) : items.length === 0 ? (
          <EmptyState title={t('membership.readersEmpty')} />
        ) : (
          <table className="membership__table">
            <thead>
              <tr>
                <th scope="col">{t('membership.columnReader')}</th>
                <th scope="col">{t('membership.columnPlan')}</th>
                <th scope="col">{t('membership.columnStatus')}</th>
                <th scope="col">{t('membership.columnRenewal')}</th>
                <th scope="col" aria-label={t('membership.columnStatus')} />
              </tr>
            </thead>
            <tbody>
              {items.map((reader) => {
                const subscription: ReaderSubscriptionView | null = reader.subscription;
                const statusKey = subscription ? STATUS_KEY[subscription.status] : undefined;
                return (
                  <tr key={reader.id}>
                    <td>
                      <strong>{reader.name ?? reader.email}</strong>
                      <span className="settings-row__meta">{reader.email}</span>
                    </td>
                    <td>{subscription?.planName ?? t('membership.noPlan')}</td>
                    <td>
                      {statusKey ? t(statusKey as Parameters<typeof t>[0]) : t('membership.noPlan')}
                    </td>
                    <td>{formatDate(subscription?.currentPeriodEnd ?? null)}</td>
                    <td>
                      {canManage && subscription && subscription.status === 'active' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => onToggleRenewal(reader, !subscription.cancelAtPeriodEnd)}
                        >
                          {subscription.cancelAtPeriodEnd
                            ? t('membership.resume')
                            : t('membership.cancel')}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {readers !== null && readers.total > items.length ? (
          <p className="settings-row__meta">
            {items.length} / {readers.total}
          </p>
        ) : null}
      </Card>
    </div>
  );
};

interface PlanDialogProps {
  open: boolean;
  plan: MembershipPlan | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: MembershipPlanInput) => void;
}

const PlanDialog = ({ open, plan, busy, error, onCancel, onSubmit }: PlanDialogProps) => {
  const t = useT();
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [interval, setInterval] = useState<'month' | 'year'>(plan?.interval ?? 'month');
  const [price, setPrice] = useState(((plan?.price ?? 0) / 100).toString());
  const [paused, setPaused] = useState(plan?.status === 'paused');

  useEffect(() => {
    setName(plan?.name ?? '');
    setDescription(plan?.description ?? '');
    setInterval(plan?.interval ?? 'month');
    setPrice(((plan?.price ?? 0) / 100).toString());
    setPaused(plan?.status === 'paused');
  }, [plan, open]);

  if (!open) return null;

  const submit = (): void => {
    const satang = Math.round(Number(price.replace(',', '.')) * 100);
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      interval,
      price: Number.isFinite(satang) && satang >= 0 ? satang : 0,
      status: paused ? 'paused' : 'active',
    });
  };

  return (
    <div className="membership__dialog" role="dialog" aria-modal="true" aria-label={t('membership.plansTitle')}>
      <div className="membership__dialog-body">
        <TextField
          label={t('membership.planName')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label={t('membership.planDescription')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Select
          label={t('membership.planInterval')}
          value={interval}
          onChange={(event) => setInterval(event.target.value === 'year' ? 'year' : 'month')}
          options={[
            { value: 'month', label: t('membership.intervalMonth') },
            { value: 'year', label: t('membership.intervalYear') },
          ]}
        />
        <TextField
          label={t('membership.planPrice')}
          value={price}
          inputMode="decimal"
          onChange={(event) => setPrice(event.target.value)}
        />
        <label className="membership__checkbox">
          <input type="checkbox" checked={paused} onChange={() => setPaused(!paused)} />
          <span>{t('membership.statusPaused')}</span>
        </label>
        {error ? (
          <p className="settings-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="membership__dialog-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={busy}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export interface MembershipPageProps {
  api: MembershipApi;
  canManage: boolean;
  /** Tab strip of the growth screens, passed through by `GrowthPage`. */
  headerTabs?: ReactNode;
}

/** Container: loads plans/readers and keeps the dialogs in step with the API. */
export const MembershipPage = ({ api, canManage, headerTabs }: MembershipPageProps) => {
  const t = useT();
  const toast = useToast();
  const [summary, setSummary] = useState<MembershipSummary | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [readers, setReaders] = useState<MembershipReaderList | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; plan: MembershipPlan | null }>({
    open: false,
    plan: null,
  });
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [nextSummary, nextPlans, nextReaders] = await Promise.all([
        api.summary(),
        api.plans(),
        api.readers(query ? { q: query } : {}),
      ]);
      setSummary(nextSummary);
      setPlans(nextPlans);
      setReaders(nextReaders);
      setError(null);
    } catch (loadError) {
      setError(messageOf(loadError, t('api.networkError')));
    }
  }, [api, query, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitPlan = async (input: MembershipPlanInput): Promise<void> => {
    setBusy(true);
    setDialogError(null);
    try {
      if (dialog.plan) {
        await api.updatePlan(dialog.plan.id, input);
      } else {
        await api.createPlan(input);
      }
      setDialog({ open: false, plan: null });
      toast.push({ tone: 'success', title: t('membership.planSaved') });
      await load();
    } catch (saveError) {
      setDialogError(messageOf(saveError, t('api.networkError')));
    } finally {
      setBusy(false);
    }
  };

  const deletePlan = async (plan: MembershipPlan): Promise<void> => {
    setBusy(true);
    try {
      await api.deletePlan(plan.id);
      toast.push({ tone: 'success', title: t('membership.planDeleted') });
      await load();
    } catch (deleteError) {
      toast.push({ tone: 'danger', title: messageOf(deleteError, t('api.networkError')) });
    } finally {
      setBusy(false);
    }
  };

  const toggleRenewal = async (reader: MembershipReader, cancel: boolean): Promise<void> => {
    if (!reader.subscription) return;
    setBusy(true);
    try {
      await api.setRenewal(reader.id, cancel);
      toast.push({
        tone: 'success',
        title: cancel ? t('membership.cancelled') : t('membership.resumed'),
        undo: {
          label: t('common.undo'),
          onClick: () => void api.setRenewal(reader.id, !cancel).then(load),
        },
      });
      await load();
    } catch (renewalError) {
      toast.push({ tone: 'danger', title: messageOf(renewalError, t('api.networkError')) });
    } finally {
      setBusy(false);
    }
  };

  const view = useMemo(
    () => (
      <MembershipView
        summary={summary}
        plans={plans}
        readers={readers}
        canManage={canManage}
        headerTabs={headerTabs}
        busy={busy}
        error={error}
        query={query}
        onQueryChange={setQuery}
        onAddPlan={() => setDialog({ open: true, plan: null })}
        onEditPlan={(plan) => setDialog({ open: true, plan })}
        onDeletePlan={(plan) => void deletePlan(plan)}
        onToggleRenewal={(reader, cancel) => void toggleRenewal(reader, cancel)}
      />
    ),
    [summary, plans, readers, canManage, headerTabs, busy, error, query, dialog],
  );

  return (
    <>
      {view}
      <PlanDialog
        open={dialog.open}
        plan={dialog.plan}
        busy={busy}
        error={dialogError}
        onCancel={() => setDialog({ open: false, plan: null })}
        onSubmit={(input) => void submitPlan(input)}
      />
    </>
  );
};

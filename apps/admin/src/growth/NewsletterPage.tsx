import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Subscriber, SubscriberList, SubscriberStatus } from '@lumio/shared';
import {
  Button,
  Card,
  DataTable,
  PageHeader,
  Select,
  TextField,
  useT,
  useToast,
  type Column,
  type MessageKey,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { ApiError } from '../api-error.js';
import type { NewsletterApi } from './api.js';

const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' });
const numberFormat = new Intl.NumberFormat('th-TH');

type StatusFilter = SubscriberStatus | 'all';

const STATUS_LABEL_KEYS: Record<SubscriberStatus, MessageKey> = {
  active: 'subscriber.active',
  unsubscribed: 'subscriber.unsubscribed',
};

const STATUSES: SubscriberStatus[] = ['active', 'unsubscribed'];

export interface NewsletterViewProps {
  list: SubscriberList | null;
  loading: boolean;
  error: string | null;
  query: string;
  status: StatusFilter;
  adding: boolean;
  addError: string | null;
  canManage: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onAdd: (email: string) => void;
  onExport: () => void;
  onToggle: (subscriber: Subscriber) => void;
  onRemove: (subscriber: Subscriber) => void;
  onRetry: () => void;
  /** Tab strip of the growth screens, rendered inside this screen's header. */
  headerTabs?: ReactNode;
}

const AddSubscriberForm = ({
  adding,
  error,
  onAdd,
}: {
  adding: boolean;
  error: string | null;
  onAdd: (email: string) => void;
}) => {
  const t = useT();
  const [email, setEmail] = useState('');

  return (
    <form
      className="newsletter-add"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(email);
        setEmail('');
      }}
    >
      <TextField
        type="email"
        label={t('newsletter.addLabel')}
        placeholder="name@example.com"
        value={email}
        required
        {...(error ? { error } : {})}
        onChange={(event) => setEmail(event.target.value)}
        fieldClassName="newsletter-add__field"
      />
      <Button type="submit" variant="primary" disabled={adding || email.trim().length === 0}>
        {adding ? t('newsletter.adding') : t('newsletter.add')}
      </Button>
    </form>
  );
};

/**
 * Newsletter subscribers (docs/design/05-admin-ia.md "เติบโต › Newsletter").
 * Removing and status changes are undoable through a toast, so nothing is lost by
 * accident, and the list can be exported as a CSV file.
 */
export const NewsletterView = ({
  list,
  loading,
  error,
  query,
  status,
  adding,
  addError,
  canManage,
  onQueryChange,
  onStatusChange,
  onAdd,
  onExport,
  onToggle,
  onRemove,
  onRetry,
  headerTabs,
}: NewsletterViewProps) => {
  const t = useT();

  const statusOptions = [
    { value: 'all', label: t('forms.statusAll') },
    ...STATUSES.map((value) => ({ value, label: t(STATUS_LABEL_KEYS[value]) })),
  ];

  const columns: Column<Subscriber>[] = [
    {
      key: 'email',
      header: t('newsletter.colEmail'),
      sortable: true,
      value: (row) => row.email,
      render: (row) => <span className="newsletter-email">{row.email}</span>,
    },
    {
      key: 'status',
      header: t('newsletter.colStatus'),
      value: (row) => t(STATUS_LABEL_KEYS[row.status]),
      render: (row) => (
        <span className={cn('newsletter-status', `newsletter-status--${row.status}`)}>
          {t(STATUS_LABEL_KEYS[row.status])}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('newsletter.colCreated'),
      sortable: true,
      value: (row) => row.createdAt,
      render: (row) => dateFormat.format(new Date(row.createdAt)),
    },
    {
      key: 'actions',
      header: t('newsletter.colActions'),
      align: 'end',
      render: (row) =>
        canManage ? (
          <div className="newsletter-actions">
            <Button variant="ghost" size="sm" onClick={() => onToggle(row)}>
              {row.status === 'active' ? t('newsletter.unsubscribe') : t('newsletter.subscribe')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(row)}>
              {t('newsletter.remove')}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="growth">
      <PageHeader
        eyebrow={t('nav.section.site')}
        title={t('nav.newsletter')}
        description={t('newsletter.subtitle')}
        tabs={headerTabs}
        meta={
          list ? (
            <span className="chip chip--primary">
              {t('newsletter.count', {
                active: numberFormat.format(list.activeCount),
                total: numberFormat.format(list.total),
              })}
            </span>
          ) : undefined
        }
      />

      <Card className="newsletter">
        {canManage ? <AddSubscriberForm adding={adding} error={addError} onAdd={onAdd} /> : null}

        <div className="newsletter__toolbar">
          <TextField
            type="search"
            label={t('newsletter.search')}
            placeholder={t('newsletter.searchPlaceholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            fieldClassName="newsletter__search"
          />
          <Select
            label={t('newsletter.filter')}
            options={statusOptions}
            value={status}
            onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
            fieldClassName="newsletter__filter"
          />
          <Button variant="secondary" onClick={onExport}>
            {t('newsletter.export')}
          </Button>
        </div>

        <DataTable
          columns={columns}
          rows={list?.items ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={onRetry}
          emptyTitle={t('newsletter.emptyTitle')}
          emptyDescription={t('newsletter.emptyDescription')}
        />
      </Card>
    </div>
  );
};

export interface NewsletterPageProps {
  api: NewsletterApi;
  canManage: boolean;
  /** Tab strip of the growth screens. */
  headerTabs?: ReactNode;
}

export const NewsletterPage = ({ api, canManage, headerTabs }: NewsletterPageProps) => {
  const t = useT();
  const { push } = useToast();
  const [list, setList] = useState<SubscriberList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(
        await api.list({
          ...(status === 'all' ? {} : { status }),
          ...(query ? { q: query } : {}),
        }),
      );
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [api, query, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (email: string): Promise<void> => {
    setAdding(true);
    setAddError(null);
    try {
      await api.add({ email: email.trim().toLowerCase() });
      await load();
    } catch (addFailure) {
      setAddError(addFailure instanceof ApiError ? addFailure.message : t('newsletter.addError'));
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (subscriber: Subscriber): Promise<void> => {
    const next: SubscriberStatus = subscriber.status === 'active' ? 'unsubscribed' : 'active';
    try {
      await api.setStatus(subscriber.id, next);
      await load();
      push({
        title: t('newsletter.toggled'),
        tone: 'success',
        undo: {
          onClick: () => {
            void api.setStatus(subscriber.id, subscriber.status).then(load);
          },
        },
      });
    } catch (toggleError) {
      setError(toggleError instanceof ApiError ? toggleError.message : t('newsletter.toggleError'));
    }
  };

  const remove = async (subscriber: Subscriber): Promise<void> => {
    try {
      await api.remove(subscriber.id);
      await load();
      push({
        title: t('newsletter.removed'),
        tone: 'success',
        undo: {
          onClick: () => {
            void api.add({ email: subscriber.email }).then(load);
          },
        },
      });
    } catch (removeError) {
      setError(removeError instanceof ApiError ? removeError.message : t('newsletter.removeError'));
    }
  };

  const exportCsv = async (): Promise<void> => {
    try {
      const file = await api.exportCsv();
      const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof ApiError ? exportError.message : t('newsletter.exportError'));
    }
  };

  return (
    <NewsletterView
      list={list}
      loading={loading}
      error={error}
      query={query}
      status={status}
      adding={adding}
      addError={addError}
      canManage={canManage}
      onQueryChange={setQuery}
      onStatusChange={setStatus}
      onAdd={(email) => void add(email)}
      onExport={() => void exportCsv()}
      onToggle={(subscriber) => void toggle(subscriber)}
      onRemove={(subscriber) => void remove(subscriber)}
      onRetry={() => void load()}
      {...(headerTabs ? { headerTabs } : {})}
    />
  );
};

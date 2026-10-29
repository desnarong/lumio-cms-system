import {
  CONTENT_STATUSES,
  localeLabel,
  trashDaysLeft,
  type ContentStatus,
  type ContentSummary,
  type ContentType,
} from '@lumio/shared';
import {
  Icon,
  Button,
  EmptyState,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  TextField,
  useT,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import { useState } from 'react';
import type { ContentApi } from '../editor/api.js';
import { useContentList } from './useContentList.js';

export interface ContentListPageProps {
  api: ContentApi;
  kind: ContentType;
  /** Languages the site offers; the filter only appears when there is more than one. */
  locales?: string[];
  /** Opens the shared "new page / new post" dialog. */
  onCreate: (kind: ContentType) => void;
  onOpenEditor: (contentId: string) => void;
}

/** Message keys per content type and status, so every label is translatable. */
const HEADING: Record<ContentType, 'content.headingPage' | 'content.headingPost'> = {
  page: 'content.headingPage',
  post: 'content.headingPost',
};
const ADD_LABEL: Record<ContentType, 'content.addPage' | 'content.addPost'> = {
  page: 'content.addPage',
  post: 'content.addPost',
};
const EMPTY_TITLE: Record<ContentType, 'content.emptyPage' | 'content.emptyPost'> = {
  page: 'content.emptyPage',
  post: 'content.emptyPost',
};

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'content.statusDraft',
  scheduled: 'content.statusScheduled',
  published: 'content.statusPublished',
  archived: 'content.statusArchived',
};

const statusOptions = (t: ReturnType<typeof useT>) => [
  { value: 'all', label: t('content.statusAll') },
  ...CONTENT_STATUSES.map((status) => ({
    value: status,
    label: t(STATUS_LABELS[status] as 'content.statusDraft'),
  })),
];

/** `2026-10-20T09:00:00.000Z` → `20/10/2026` (stable across ICU builds). */
export const formatDate = (iso: string): string => {
  const [date] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

export interface ContentViewProps {
  kind: ContentType;
  items: ContentSummary[];
  query: string;
  status: ContentStatus | 'all';
  /** Language filter, or 'all' (docs/design/17-i18n.md 17.3). */
  locale: string | 'all';
  /** Languages the site offers; more than one shows the filter. */
  locales: string[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  cursor: string | null;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: ContentStatus | 'all') => void;
  onLocaleChange: (value: string | 'all') => void;
  onReload: () => void;
  onLoadMore: () => void;
  onArchive: (item: ContentSummary) => void;
  /** Brings a trashed item back as a draft. */
  onRestore: (item: ContentSummary) => void;
  /** Deletes a trashed item for good; the container confirms first. */
  onPurge: (item: ContentSummary) => void;
  onCreate: (kind: ContentType) => void;
  onOpenEditor: (contentId: string) => void;
}

/**
 * List screen for pages or posts (docs/design/05-admin-ia.md 5.4): search, filter
 * by status, cursor pagination, and a reversible "move to trash" instead of a
 * confirm dialog. Trashed rows switch to restore / delete-for-good, with the
 * days left before the automatic purge.
 */
export const ContentView = ({
  kind,
  items,
  query,
  status,
  locale,
  locales,
  loading,
  loadingMore,
  error,
  cursor,
  onQueryChange,
  onStatusChange,
  onLocaleChange,
  onReload,
  onLoadMore,
  onArchive,
  onRestore,
  onPurge,
  onCreate,
  onOpenEditor,
}: ContentViewProps) => {
  const t = useT();
  const filtering = query.trim().length > 0 || status !== 'all' || locale !== 'all';
  const showLocale = locales.length > 1;

  return (
    <div className="content-list">
      <PageHeader
        eyebrow={t('nav.section.work')}
        title={t(HEADING[kind])}
        description={
          loading
            ? t('common.loading')
            : t(cursor ? 'content.countMore' : 'content.countAll', { count: items.length })
        }
        actions={
          <Button variant="primary" onClick={() => onCreate(kind)}>
            <Icon name="plus" size={16} />
            {t(ADD_LABEL[kind])}
          </Button>
        }
      />

      <div className="content-list__filters">
        <TextField
          label={t('content.searchLabel')}
          placeholder={t('content.searchPlaceholder', { kind: t(HEADING[kind]) })}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <Select
          label={t('content.statusLabel')}
          options={statusOptions(t)}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ContentStatus | 'all')}
        />
        {showLocale ? (
          <Select
            label={t('content.languageLabel')}
            options={[
              { value: 'all', label: t('content.languageAll') },
              ...locales.map((code) => ({ value: code, label: localeLabel(code) })),
            ]}
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value)}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="content-list__rows" aria-busy="true">
          <Skeleton shape="block" height={56} />
          <Skeleton shape="block" height={56} />
          <Skeleton shape="block" height={56} />
        </div>
      ) : error ? (
        <EmptyState
          tone="error"
          title={t('content.loadError')}
          description={error}
          action={
            <Button variant="secondary" onClick={onReload}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<Icon name="folder" size={32} />}
          title={filtering ? t('content.noMatch') : t(EMPTY_TITLE[kind])}
          description={filtering ? t('content.noMatchHint') : t('content.emptyHint')}
          action={
            <Button variant="primary" onClick={() => onCreate(kind)}>
              {t(ADD_LABEL[kind])}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="content-list__rows">
            {items.map((item) => (
              <li key={item.id} className="content-row">
                <div className="content-row__main">
                  <span className="content-row__title">{item.title}</span>
                  <span className="content-row__link">/{item.slug}</span>
                </div>
                <span className={cn('content-row__status', `content-row__status--${item.status}`)}>
                  {t(STATUS_LABELS[item.status] as 'content.statusDraft')}
                </span>
                <span className="content-row__date">{formatDate(item.updatedAt)}</span>
                {showLocale ? (
                  <span className="content-row__locale">{localeLabel(item.locale)}</span>
                ) : null}
                <div className="content-row__actions">
                  {item.status === 'archived' ? (
                    <>
                      <span className="content-row__purge">
                        {t('content.autoDeleteIn', {
                          days: trashDaysLeft(item.archivedAt),
                        })}
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => onRestore(item)}>
                        {t('content.restore')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onPurge(item)}>
                        {t('content.purge')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => onOpenEditor(item.id)}>
                        {t('content.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onArchive(item)}>
                        {t('content.trash')}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {cursor ? (
            <div className="content-list__more">
              <Button variant="secondary" disabled={loadingMore} onClick={onLoadMore}>
                {loadingMore ? t('common.loading') : t('content.loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

/** Loads the list, then hands it to the view. Deleting for good asks first. */
export const ContentListPage = ({
  api,
  kind,
  locales,
  onCreate,
  onOpenEditor,
}: ContentListPageProps) => {
  const t = useT();
  const list = useContentList(api, kind);
  const [pendingPurge, setPendingPurge] = useState<ContentSummary | null>(null);

  return (
    <>
      <ContentView
        kind={kind}
        items={list.items}
        query={list.query}
        status={list.status}
        locale={list.locale}
        locales={locales ?? []}
        loading={list.loading}
        loadingMore={list.loadingMore}
        error={list.error}
        cursor={list.cursor}
        onQueryChange={list.setQuery}
        onStatusChange={list.setStatus}
        onLocaleChange={list.setLocale}
        onReload={() => void list.reload()}
        onLoadMore={() => void list.loadMore()}
        onArchive={(item) => void list.archive(item)}
        onRestore={(item) => void list.restore(item)}
        onPurge={setPendingPurge}
        onCreate={onCreate}
        onOpenEditor={onOpenEditor}
      />

      <Modal
        open={pendingPurge !== null}
        size="sm"
        title={t('content.purgeTitle')}
        description={
          pendingPurge ? t('content.purgeBody', { title: pendingPurge.title }) : undefined
        }
        onClose={() => setPendingPurge(null)}
        footer={
          <div className="content-list__confirm">
            <Button variant="ghost" onClick={() => setPendingPurge(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const target = pendingPurge;
                setPendingPurge(null);
                if (target) void list.purge(target);
              }}
            >
              {t('content.purge')}
            </Button>
          </div>
        }
      />
    </>
  );
};

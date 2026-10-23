import { useState } from 'react';
import {
  localeLabel,
  type CopyFormToLocaleInput,
  type CreateFormInput,
  type Form,
  type FormField,
  type FormSubmissionStatus,
  type FormSummary,
} from '@lumio/shared';
import {
  Icon,
  Button,
  EmptyState,
  Modal,
  Select,
  Skeleton,
  useT,
  type MessageKey,
  type Translate,
} from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import type { FormsApi } from './api.js';
import { FormEditorDialog } from './FormEditorDialog.js';
import { useForms, type FormsController } from './useForms.js';

/** `2026-10-24T01:20:00.000Z` → `24/10/2026 01:20` (stable across ICU builds). */
export const formatDateTime = (iso: string): string => {
  const [date, time] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  const clock = (time ?? '').slice(0, 5);
  return year && month && day ? `${day}/${month}/${year} ${clock}` : '';
};

const STATUS_LABEL_KEYS: Record<FormSubmissionStatus, MessageKey> = {
  new: 'forms.statusNew',
  read: 'forms.statusRead',
  archived: 'forms.statusArchived',
};

const STATUSES: FormSubmissionStatus[] = ['new', 'read', 'archived'];

const displayValue = (field: FormField | undefined, value: string, t: Translate): string => {
  if (field?.type === 'checkbox')
    return value === 'true' ? t('forms.confirmed') : t('forms.notConfirmed');
  return value;
};

/**
 * "Add another language" dialog: the fields are copied to the chosen language so
 * the labels can be translated, and both forms stay linked
 * (docs/design/17-i18n.md 17.5). Languages that already exist are left out.
 */
const AddLanguageDialog = ({
  summary,
  locales,
  onCancel,
  onConfirm,
}: {
  summary: FormSummary;
  locales: string[];
  onCancel: () => void;
  onConfirm: (locale: string) => void;
}) => {
  const t = useT();
  const remaining = locales.filter((locale) => locale !== summary.locale);
  const [locale, setLocale] = useState(remaining[0] ?? '');

  return (
    <Modal
      open
      title={t('forms.addLanguageTitle')}
      description={t('forms.addLanguageBody')}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={locale.length === 0}
            onClick={() => onConfirm(locale)}
          >
            {t('forms.createLanguage')}
          </Button>
        </>
      }
    >
      {remaining.length === 0 ? (
        <p className="forms-dialog__note">{t('forms.allLanguagesPresent')}</p>
      ) : (
        <Select
          label={t('forms.language')}
          value={locale}
          options={remaining.map((item) => ({ value: item, label: localeLabel(item) }))}
          onChange={(event) => setLocale(event.target.value)}
        />
      )}
    </Modal>
  );
};

export interface FormsViewProps {
  controller: FormsController;
  /** Owners, admins and editors may change forms; others only read messages. */
  canManage: boolean;
  /** Languages the site offers; a form can have one copy per language. */
  locales?: string[];
  onCreate: () => void;
  onEdit: (summary: FormSummary) => void;
  onRemove: (summary: FormSummary) => void;
  onAddLanguage?: (summary: FormSummary, locale: string) => void;
}

/**
 * "ฟอร์ม & ข้อความที่ได้รับ" (docs/design/05-admin-ia.md 5.1): pick a form on the
 * left, read and triage its messages on the right. Deleting is reversible, so it
 * never asks for a confirmation.
 */
export const FormsView = ({
  controller,
  canManage,
  locales = [],
  onCreate,
  onEdit,
  onRemove,
  onAddLanguage,
}: FormsViewProps) => {
  const t = useT();
  const [addingLanguage, setAddingLanguage] = useState(false);
  const {
    summaries,
    selectedId,
    selected,
    selectedForm,
    submissions,
    status,
    loading,
    inboxLoading,
    error,
    cursor,
  } = controller;

  const statusOptions = [
    { value: 'all', label: t('forms.statusAll') },
    ...STATUSES.map((value) => ({ value, label: t(STATUS_LABEL_KEYS[value]) })),
  ];

  const newTotal = summaries.reduce((total, summary) => total + summary.newCount, 0);

  const labelFor = (name: string): string =>
    selectedForm?.fields.find((field) => field.name === name)?.label ?? name;

  const valueFor = (name: string, value: string): string =>
    displayValue(
      selectedForm?.fields.find((field) => field.name === name),
      value,
      t,
    );

  return (
    <div className="forms-page">
      <header className="forms-header">
        <div>
          <h1 className="forms-header__title">{t('forms.title')}</h1>
          <p className="forms-header__subtitle">
            {loading
              ? t('forms.loading')
              : t('forms.summary', { forms: summaries.length, new: newTotal })}
          </p>
        </div>
        {canManage ? (
          <Button variant="primary" onClick={onCreate}>
            {t('forms.create')}
          </Button>
        ) : null}
      </header>

      {loading ? (
        <div className="forms-layout" aria-busy="true">
          <Skeleton shape="block" height={220} />
          <Skeleton shape="block" height={220} />
        </div>
      ) : error && summaries.length === 0 ? (
        <EmptyState
          tone="error"
          title={t('forms.loadError')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void controller.reload()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : summaries.length === 0 ? (
        <EmptyState
          illustration={<Icon name="mail" size={32} />}
          title={t('forms.emptyTitle')}
          description={canManage ? t('forms.emptyManage') : t('forms.emptyRead')}
          {...(canManage
            ? {
                action: (
                  <Button variant="primary" onClick={onCreate}>
                    {t('forms.create')}
                  </Button>
                ),
              }
            : {})}
        />
      ) : (
        <div className="forms-layout">
          <aside className="forms-sidebar" aria-label={t('forms.listLabel')}>
            <ul className="forms-list">
              {summaries.map((summary) => (
                <li key={summary.id}>
                  <button
                    type="button"
                    className={cn('forms-item', summary.id === selectedId && 'forms-item--active')}
                    aria-current={summary.id === selectedId ? 'true' : undefined}
                    onClick={() => controller.select(summary.id)}
                  >
                    <span className="forms-item__name">{summary.name}</span>
                    <span className="forms-item__meta">
                      {t('forms.fieldsAndMessages', {
                        fields: summary.fieldCount,
                        messages: summary.submissionCount,
                      })}
                    </span>
                    {locales.length > 1 ? (
                      <span className="forms-item__lang">
                        {summary.locale
                          ? localeLabel(summary.locale)
                          : t('forms.sharedAllLanguages')}
                      </span>
                    ) : null}
                    {summary.newCount > 0 ? (
                      <span className="forms-item__badge">
                        {t('forms.newCount', { count: summary.newCount })}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="forms-inbox" aria-label={t('forms.inboxLabel')}>
            <header className="forms-inbox__header">
              <div className="forms-inbox__heading">
                <h2 className="forms-inbox__title">{selected?.name ?? t('forms.pickForm')}</h2>
                <p className="forms-inbox__meta">
                  {selectedForm ? t('forms.fieldCount', { count: selectedForm.fields.length }) : ''}
                </p>
              </div>

              <div className="forms-inbox__actions">
                <Select
                  aria-label={t('forms.showLabel')}
                  fieldClassName="forms-inbox__filter"
                  value={status}
                  options={statusOptions}
                  onChange={(event) =>
                    controller.setStatus(event.target.value as FormSubmissionStatus | 'all')
                  }
                />
                {canManage ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={!selected}
                      onClick={() => selected && onEdit(selected)}
                    >
                      {t('forms.editForm')}
                    </Button>
                    {locales.length > 1 && onAddLanguage ? (
                      <Button
                        variant="secondary"
                        disabled={!selected}
                        onClick={() => setAddingLanguage(true)}
                      >
                        {t('forms.translateTo')}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="forms-inbox__delete"
                      disabled={!selected}
                      onClick={() => selected && onRemove(selected)}
                    >
                      {t('forms.deleteForm')}
                    </Button>
                  </>
                ) : null}
              </div>
            </header>

            {inboxLoading && submissions.length === 0 ? (
              <div className="forms-messages" aria-busy="true">
                <Skeleton shape="block" height={96} />
                <Skeleton shape="block" height={96} />
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState
                illustration={<Icon name="inbox" size={32} />}
                title={status === 'all' ? t('forms.noMessages') : t('forms.noMessagesInStatus')}
                description={t('forms.noMessagesHint')}
              />
            ) : (
              <>
                <ul className="forms-messages">
                  {submissions.map((submission) => (
                    <li className="forms-message" key={submission.id}>
                      <div className="forms-message__top">
                        <span
                          className={cn(
                            'forms-message__status',
                            `forms-message__status--${submission.status}`,
                          )}
                        >
                          {t(STATUS_LABEL_KEYS[submission.status])}
                        </span>
                        <span className="forms-message__date">
                          {formatDateTime(submission.createdAt)}
                        </span>
                      </div>

                      <dl className="forms-message__answers">
                        {Object.entries(submission.data)
                          .filter(([, value]) => value.length > 0)
                          .map(([name, value]) => (
                            <div className="forms-message__answer" key={name}>
                              <dt>{labelFor(name)}</dt>
                              <dd>{valueFor(name, value)}</dd>
                            </div>
                          ))}
                      </dl>

                      <div className="forms-message__actions">
                        {canManage && submission.status === 'new' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void controller.markRead(submission)}
                          >
                            {t('forms.markRead')}
                          </Button>
                        ) : null}
                        {canManage ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void controller.archive(submission)}
                          >
                            {t('forms.archive')}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                {cursor ? (
                  <div className="forms-inbox__more">
                    <Button
                      variant="secondary"
                      disabled={inboxLoading}
                      onClick={() => void controller.loadMore()}
                    >
                      {inboxLoading ? t('forms.loadingMore') : t('forms.loadMore')}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}

      {addingLanguage && selected ? (
        <AddLanguageDialog
          summary={selected}
          locales={locales}
          onCancel={() => setAddingLanguage(false)}
          onConfirm={(locale) => {
            setAddingLanguage(false);
            onAddLanguage?.(selected, locale);
          }}
        />
      ) : null}
    </div>
  );
};

export interface FormsPageProps {
  api: FormsApi;
  /** Hides every write action for roles that may only read (13-rbac.md). */
  canManage?: boolean;
  /** Languages the site offers, so a form can be copied per language. */
  locales?: string[];
}

export const FormsPage = ({ api, canManage = true, locales = [] }: FormsPageProps) => {
  const controller = useForms(api);
  const [editing, setEditing] = useState<{ form: Form | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = async (summary: FormSummary): Promise<void> => {
    try {
      setEditing({ form: await api.get(summary.id) });
    } catch {
      setEditing({ form: null });
    }
  };

  const submit = async (input: CreateFormInput): Promise<void> => {
    setSaving(true);
    try {
      const result = editing?.form
        ? await controller.update(editing.form.id, input)
        : await controller.create(input);
      if (result) setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const addLanguage = async (summary: FormSummary, locale: string): Promise<void> => {
    await controller.copyToLocale(summary.id, { locale } satisfies CopyFormToLocaleInput);
  };

  return (
    <>
      <FormsView
        controller={controller}
        canManage={canManage}
        locales={locales}
        onCreate={() => setEditing({ form: null })}
        onEdit={(summary) => void openEdit(summary)}
        onRemove={(summary) => void controller.remove(summary)}
        onAddLanguage={(summary, locale) => void addLanguage(summary, locale)}
      />

      {editing ? (
        <FormEditorDialog
          key={editing.form?.id ?? 'new'}
          form={editing.form}
          saving={saving}
          onSubmit={(input) => void submit(input)}
          onCancel={() => setEditing(null)}
        />
      ) : null}
    </>
  );
};

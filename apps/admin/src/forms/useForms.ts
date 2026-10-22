import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CopyFormToLocaleInput,
  CreateFormInput,
  Form,
  FormSubmission,
  FormSubmissionStatus,
  FormSummary,
  UpdateFormInput,
} from '@lumio/shared';
import { translateNow, useT, useToast } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { FormsApi } from './api.js';

export const formsErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

const PAGE_SIZE = 20;

export interface FormsController {
  summaries: FormSummary[];
  selectedId: string | null;
  selected: FormSummary | null;
  /** Full definition of the selected form, so the inbox can label each answer. */
  selectedForm: Form | null;
  submissions: FormSubmission[];
  status: FormSubmissionStatus | 'all';
  loading: boolean;
  inboxLoading: boolean;
  error: string | null;
  cursor: string | null;
  select: (formId: string) => void;
  setStatus: (status: FormSubmissionStatus | 'all') => void;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  /** Reversible "move to the archive"; the toast offers an undo. */
  archive: (submission: FormSubmission) => Promise<void>;
  markRead: (submission: FormSubmission) => Promise<void>;
  create: (input: CreateFormInput) => Promise<Form | null>;
  /** Adds a language to a form; the fields are copied for translation. */
  copyToLocale: (formId: string, input: CopyFormToLocaleInput) => Promise<Form | null>;
  update: (formId: string, input: UpdateFormInput) => Promise<Form | null>;
  remove: (summary: FormSummary) => Promise<void>;
}

/**
 * State for the "ฟอร์ม & ข้อความที่ได้รับ" screen (docs/design/05-admin-ia.md 5.4):
 * the form list, the message inbox of the selected form, and reversible edits.
 */
export const useForms = (api: FormsApi): FormsController => {
  const t = useT();
  const toast = useToast();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [summaries, setSummaries] = useState<FormSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [status, setStatus] = useState<FormSubmissionStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiRef.current.list();
      setSummaries(list);
      setSelectedId((current) =>
        current && list.some((entry) => entry.id === current) ? current : (list[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(formsErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!selectedId) {
      setSubmissions([]);
      setSelectedForm(null);
      setCursor(null);
      return undefined;
    }

    let active = true;
    setInboxLoading(true);
    void apiRef.current
      .get(selectedId)
      .then((form) => {
        if (active) setSelectedForm(form);
      })
      .catch(() => {
        if (active) setSelectedForm(null);
      });
    void apiRef.current
      .listSubmissions(selectedId, { limit: PAGE_SIZE, ...(status === 'all' ? {} : { status }) })
      .then((page) => {
        if (!active) return;
        setSubmissions(page.items);
        setCursor(page.cursor);
      })
      .catch((loadError) => {
        if (active) setError(formsErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setInboxLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, status]);

  const loadMore = useCallback(async () => {
    if (!selectedId || !cursor) return;
    setInboxLoading(true);
    try {
      const page = await apiRef.current.listSubmissions(selectedId, {
        limit: PAGE_SIZE,
        cursor,
        ...(status === 'all' ? {} : { status }),
      });
      setSubmissions((current) => [...current, ...page.items]);
      setCursor(page.cursor);
    } catch (loadError) {
      setError(formsErrorMessage(loadError));
    } finally {
      setInboxLoading(false);
    }
  }, [cursor, selectedId, status]);

  const setSubmissionStatus = useCallback(
    async (submission: FormSubmission, next: FormSubmissionStatus) => {
      try {
        await apiRef.current.updateSubmission(submission.formId, submission.id, { status: next });
      } catch (updateError) {
        toast.push({ tone: 'danger', title: formsErrorMessage(updateError) });
      }
    },
    [toast],
  );

  const refreshSummaries = useCallback(async () => {
    try {
      setSummaries(await apiRef.current.list());
    } catch {
      // Counters are cosmetic; a failed refresh must not break the screen.
    }
  }, []);

  const markRead = useCallback(
    async (submission: FormSubmission) => {
      setSubmissions((current) =>
        current.map((entry) =>
          entry.id === submission.id ? { ...entry, status: 'read' } : entry,
        ),
      );
      await setSubmissionStatus(submission, 'read');
      await refreshSummaries();
    },
    [refreshSummaries, setSubmissionStatus],
  );

  const archive = useCallback(
    async (submission: FormSubmission) => {
      const previous = submission.status;
      setSubmissions((current) => current.filter((entry) => entry.id !== submission.id));
      await setSubmissionStatus(submission, 'archived');
      await refreshSummaries();
      toast.push({
        tone: 'success',
        title: t('forms.archivedToast'),
        undo: {
          label: t('common.undo'),
          onClick: () => {
            void setSubmissionStatus({ ...submission, status: previous }, previous).then(
              refreshSummaries,
            );
          },
        },
      });
    },
    [refreshSummaries, setSubmissionStatus, t, toast],
  );

  const create = useCallback(
    async (input: CreateFormInput): Promise<Form | null> => {
      try {
        const created = await apiRef.current.create(input);
        await reload();
        setSelectedId(created.id);
        toast.push({ tone: 'success', title: t('forms.createdToast') });
        return created;
      } catch (createError) {
        toast.push({ tone: 'danger', title: formsErrorMessage(createError) });
        return null;
      }
    },
    [reload, t, toast],
  );

  const copyToLocale = useCallback(
    async (formId: string, input: CopyFormToLocaleInput): Promise<Form | null> => {
      try {
        const created = await apiRef.current.copyToLocale(formId, input);
        await reload();
        setSelectedId(created.id);
        toast.push({ tone: 'success', title: t('forms.createdLanguageToast') });
        return created;
      } catch (copyError) {
        toast.push({ tone: 'danger', title: formsErrorMessage(copyError) });
        return null;
      }
    },
    [reload, t, toast],
  );

  const update = useCallback(
    async (formId: string, input: UpdateFormInput): Promise<Form | null> => {
      try {
        const updated = await apiRef.current.update(formId, input);
        await refreshSummaries();
        toast.push({ tone: 'success', title: t('forms.savedToast') });
        return updated;
      } catch (updateError) {
        toast.push({ tone: 'danger', title: formsErrorMessage(updateError) });
        return null;
      }
    },
    [refreshSummaries, t, toast],
  );

  const remove = useCallback(
    async (summary: FormSummary) => {
      let removed: Form | null = null;
      try {
        removed = await apiRef.current.get(summary.id);
      } catch {
        removed = null;
      }

      try {
        await apiRef.current.remove(summary.id);
        await reload();
        toast.push({
          tone: 'success',
          title: t('forms.deletedToast', { name: summary.name }),
          ...(removed
            ? {
                undo: {
                  label: t('common.undo'),
                  onClick: () => {
                    void apiRef.current
                      .create({
                        name: removed!.name,
                        fields: removed!.fields,
                        notify: removed!.notify,
                        successMessage: removed!.successMessage,
                      })
                      .then(reload);
                  },
                },
              }
            : {}),
        });
      } catch (removeError) {
        toast.push({ tone: 'danger', title: formsErrorMessage(removeError) });
      }
    },
    [reload, t, toast],
  );

  return {
    summaries,
    selectedId,
    selected: summaries.find((entry) => entry.id === selectedId) ?? null,
    selectedForm,
    submissions,
    status,
    loading,
    inboxLoading,
    error,
    cursor,
    select: setSelectedId,
    setStatus,
    reload,
    loadMore,
    archive,
    markRead,
    create,
    copyToLocale,
    update,
    remove,
  };
};

/** Full form definitions for the editor's form picker and block preview. */
export const loadFullForms = async (api: FormsApi): Promise<Form[]> => {
  const summaries = await api.list();
  return Promise.all(summaries.map((summary) => api.get(summary.id)));
};

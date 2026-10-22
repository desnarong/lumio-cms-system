import type {
  CopyFormToLocaleInput,
  CreateFormInput,
  Form,
  FormSubmission,
  FormSubmissionStatus,
  FormSummary,
  UpdateFormInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

export { ApiError } from '../api-error.js';

/** One page of submissions, with the cursor the API returned. */
export interface SubmissionPage {
  items: FormSubmission[];
  cursor: string | null;
}

export interface SubmissionQuery {
  status?: FormSubmissionStatus;
  cursor?: string;
  limit?: number;
}

/** Everything the forms screen needs, so tests can swap in a fake. */
export interface FormsApi {
  list(): Promise<FormSummary[]>;
  get(formId: string): Promise<Form>;
  create(input: CreateFormInput): Promise<Form>;
  /** Copies the form into another language, labels untouched. */
  copyToLocale(formId: string, input: CopyFormToLocaleInput): Promise<Form>;
  update(formId: string, input: UpdateFormInput): Promise<Form>;
  remove(formId: string): Promise<void>;
  listSubmissions(formId: string, query?: SubmissionQuery): Promise<SubmissionPage>;
  updateSubmission(
    formId: string,
    submissionId: string,
    input: { status: FormSubmissionStatus },
  ): Promise<FormSubmission>;
}

interface Envelope<T> {
  data: T;
  meta?: { cursor?: string | null };
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpFormsApiConfig {
  /** API origin from `VITE_API_URL`. */
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

const queryString = (query: SubmissionQuery): string => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.cursor) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));
  return params.toString();
};

/**
 * Talks to `/api/v1/forms`. The site is always sent as `X-Site-Id`, because
 * `/forms/:formId` uses its path parameter for the form, not the site.
 */
export const createHttpFormsApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpFormsApiConfig): FormsApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const send = async (path: string, init: RequestInit = {}): Promise<Envelope<unknown>> => {
    const token = getAccessToken?.() ?? null;
    const siteId = getSiteId?.() ?? null;

    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(siteId ? { 'x-site-id': siteId } : {}),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | Envelope<unknown>
      | ErrorEnvelope
      | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return payload as Envelope<unknown>;
  };

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> =>
    (await send(path, init)).data as T;

  return {
    list: () => request<FormSummary[]>('/forms'),
    get: (formId) => request<Form>(`/forms/${formId}`),
    create: (input) => request<Form>('/forms', { method: 'POST', body: JSON.stringify(input) }),
    copyToLocale: (formId, input) =>
      request<Form>(`/forms/${formId}/locale`, { method: 'POST', body: JSON.stringify(input) }),
    update: (formId, input) =>
      request<Form>(`/forms/${formId}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: async (formId) => {
      await request<{ success: boolean }>(`/forms/${formId}`, { method: 'DELETE' });
    },
    listSubmissions: async (formId, query = {}) => {
      const payload = await send(`/forms/${formId}/submissions?${queryString(query)}`);
      return {
        items: (payload.data ?? []) as FormSubmission[],
        cursor: payload.meta?.cursor ?? null,
      };
    },
    updateSubmission: (formId, submissionId, input) =>
      request<FormSubmission>(`/forms/${formId}/submissions/${submissionId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  };
};

import type {
  MembershipPlan,
  MembershipPlanInput,
  MembershipReaderList,
  MembershipSummary,
  ReaderListQuery,
  ReaderSubscriptionView,
  UpdateMembershipPlanInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Plans, readers and revenue of one site (docs/PROGRESS.md batch A). */
export interface MembershipApi {
  plans(): Promise<MembershipPlan[]>;
  createPlan(input: MembershipPlanInput): Promise<MembershipPlan>;
  updatePlan(planId: string, input: UpdateMembershipPlanInput): Promise<MembershipPlan>;
  deletePlan(planId: string): Promise<void>;
  readers(query?: ReaderListQuery): Promise<MembershipReaderList>;
  summary(): Promise<MembershipSummary>;
  /** Stops or resumes the next renewal; the paid period always stays. */
  setRenewal(readerId: string, cancel: boolean): Promise<ReaderSubscriptionView>;
}

interface Envelope<T> {
  data: T;
  meta?: { cursor?: string | null; total?: number };
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpMembershipApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

const queryString = (query: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text.length > 0 ? `?${text}` : '';
};

export const createHttpMembershipApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpMembershipApiConfig): MembershipApi => {
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

  const request = async <T>(path: string, init?: RequestInit): Promise<T> =>
    (await send(path, init)).data as T;

  return {
    plans: async () => request<{ items: MembershipPlan[] }>('/membership/plans').then((r) => r.items),
    createPlan: (input) =>
      request<MembershipPlan>('/membership/plans', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updatePlan: (planId, input) =>
      request<MembershipPlan>(`/membership/plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deletePlan: async (planId) => {
      await send(`/membership/plans/${planId}`, { method: 'DELETE' });
    },
    readers: (query = {}) =>
      request<MembershipReaderList>(
        `/membership/readers${queryString(query as Record<string, unknown>)}`,
      ),
    summary: () => request<MembershipSummary>('/membership/summary'),
    setRenewal: (readerId, cancel) =>
      request<ReaderSubscriptionView>(`/membership/readers/${readerId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancel }),
      }),
  };
};

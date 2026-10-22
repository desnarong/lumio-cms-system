import type { CreateSectionTemplateInput, SectionTemplate } from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from './api.js';

/** The site's own library of saved sections (docs/design/07-blocks.md 7.2). */
export interface SectionTemplateApi {
  list(): Promise<SectionTemplate[]>;
  create(input: CreateSectionTemplateInput): Promise<SectionTemplate>;
  remove(id: string): Promise<void>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpSectionTemplateApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Talks to `/api/v1/section-templates` (site always sent as `X-Site-Id`). */
export const createHttpSectionTemplateApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpSectionTemplateApiConfig): SectionTemplateApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
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
      | Envelope<T>
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

    return (payload as Envelope<T>).data;
  };

  return {
    list: () => request<SectionTemplate[]>('/section-templates'),
    create: (input) =>
      request<SectionTemplate>('/section-templates', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    remove: async (id) => {
      await request<{ success: boolean }>(`/section-templates/${id}`, { method: 'DELETE' });
    },
  };
};

/** In-memory library so saving and re-inserting a section works without the API. */
export const createDemoSectionTemplateApi = (): SectionTemplateApi => {
  let items: SectionTemplate[] = [];
  let counter = 0;

  return {
    list: async () => items,

    create: async (input) => {
      counter += 1;
      const saved: SectionTemplate = {
        id: `demo-section-${counter}`,
        name: input.name,
        blocks: input.blocks,
        createdAt: new Date().toISOString(),
        createdBy: null,
      };
      items = [saved, ...items];
      return saved;
    },

    remove: async (id) => {
      const exists = items.some((item) => item.id === id);
      if (!exists) throw new ApiError('not_found', translateNow('sections.notFound'), 404);
      items = items.filter((item) => item.id !== id);
    },
  };
};

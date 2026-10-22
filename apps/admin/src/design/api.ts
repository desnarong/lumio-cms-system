import type {
  ApplyTemplateInput,
  BlockTree,
  CreateSectionTemplateInput,
  DesignTemplateResult,
  DesignTokens,
  GlobalBlockKind,
  GlobalBlocks,
  MenuDetail,
  MenuLocation,
  SectionTemplate,
  TemplateSummary,
  ThemeTokensPatch,
  UpdateMenuInput,
  UpdateSectionTemplateInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Everything the Design screens talk to (docs/design/08-theme-design-panel.md). */
export interface DesignApi {
  getTokens(): Promise<DesignTokens>;
  updateTokens(patch: ThemeTokensPatch): Promise<DesignTokens>;
  resetTokens(): Promise<DesignTokens>;
  listTemplates(): Promise<TemplateSummary[]>;
  applyTemplate(templateId: string, input: ApplyTemplateInput): Promise<DesignTemplateResult>;
  getMenu(location: MenuLocation, locale?: string): Promise<MenuDetail>;
  updateMenu(location: MenuLocation, input: UpdateMenuInput): Promise<MenuDetail>;
  getGlobalBlocks(): Promise<GlobalBlocks>;
  updateGlobalBlock(kind: GlobalBlockKind, blocks: BlockTree): Promise<GlobalBlocks>;
  listSections(): Promise<SectionTemplate[]>;
  createSection(input: CreateSectionTemplateInput): Promise<SectionTemplate>;
  renameSection(id: string, input: UpdateSectionTemplateInput): Promise<SectionTemplate>;
  removeSection(id: string): Promise<void>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpDesignApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Talks to `/design`, `/menus`, `/global-blocks`, `/templates`, `/section-templates`. */
export const createHttpDesignApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpDesignApiConfig): DesignApi => {
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
    getTokens: () => request<DesignTokens>('/design/tokens'),
    updateTokens: (patch) =>
      request<DesignTokens>('/design/tokens', { method: 'PATCH', body: JSON.stringify(patch) }),
    resetTokens: () => request<DesignTokens>('/design/tokens/reset', { method: 'POST' }),

    listTemplates: () => request<TemplateSummary[]>('/templates'),
    applyTemplate: (templateId, input) =>
      request<DesignTemplateResult>(`/design/template/${templateId}/apply`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    getMenu: (location, locale) =>
      request<MenuDetail>(`/menus/${location}${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`),
    updateMenu: (location, input) =>
      request<MenuDetail>(`/menus/${location}`, { method: 'PUT', body: JSON.stringify(input) }),

    getGlobalBlocks: () => request<GlobalBlocks>('/global-blocks'),
    updateGlobalBlock: (kind, blocks) =>
      request<GlobalBlocks>(`/global-blocks/${kind}`, {
        method: 'PUT',
        body: JSON.stringify({ blocks }),
      }),

    listSections: () => request<SectionTemplate[]>('/section-templates'),
    createSection: (input) =>
      request<SectionTemplate>('/section-templates', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    renameSection: (id, input) =>
      request<SectionTemplate>(`/section-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    removeSection: async (id) => {
      await request<{ success: boolean }>(`/section-templates/${id}`, { method: 'DELETE' });
    },
  };
};

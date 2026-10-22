import type {
  AiAltTextBatchInput,
  AiAltTextBatchResult,
  AiAltTextInput,
  AiBlockCommandInput,
  AiGenerateSiteInput,
  AiProposal,
  AiResult,
  AiRewriteInput,
  AiSeoInput,
  AiSiteCommandInput,
  AiSiteCommandResult,
  AiSiteDraft,
  AiStatus,
  AiTranslateInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import { readAdminLocale } from '../shell/locale-preference.js';

/**
 * The AI assistant client (docs/design/09-ai-assistant.md 9.5). Every call
 * answers with a proposal, never with a saved change: the screen shows it as a
 * diff and the user decides whether to apply it.
 */
export interface AiApi {
  status(): Promise<AiStatus>;
  rewrite(input: AiRewriteInput): Promise<AiResult>;
  translate(input: AiTranslateInput): Promise<AiResult>;
  altText(input: AiAltTextInput): Promise<AiResult>;
  /** Describes several images at once, for the "missing alt" filter. */
  altTextBatch(input: AiAltTextBatchInput): Promise<AiAltTextBatchResult>;
  seo(input: AiSeoInput): Promise<AiResult>;
  /** Edits the text of the selected block from one sentence. */
  blockCommand(input: AiBlockCommandInput): Promise<AiResult>;
  /** Drafts the onboarding answers from one sentence (wizard step 1). */
  generateSite(input: AiGenerateSiteInput): Promise<AiSiteDraft>;
  /** "Make every button orange": a design-token diff for the whole site. */
  siteCommand(input: AiSiteCommandInput): Promise<AiSiteCommandResult>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpAiApiConfig {
  /** API origin from `VITE_API_URL`. */
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Talks to `/api/v1/ai` (the site always travels as `X-Site-Id`). */
export const createHttpAiApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpAiApiConfig): AiApi => {
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
        'x-locale': readAdminLocale(),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as Envelope<T> | ErrorEnvelope | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.aiError'),
        response.status,
      );
    }

    return (payload as Envelope<T>).data;
  };

  const send = <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) });

  return {
    status: () => request<AiStatus>('/ai/status'),
    rewrite: (input) => send<AiResult>('/ai/rewrite', input),
    translate: (input) => send<AiResult>('/ai/translate', input),
    altText: (input) => send<AiResult>('/ai/alt-text', input),
    altTextBatch: (input) => send<AiAltTextBatchResult>('/ai/alt-text/batch', input),
    seo: (input) => send<AiResult>('/ai/seo', input),
    blockCommand: (input) => send<AiResult>('/ai/block-command', input),
    generateSite: (input) => send<AiSiteDraft>('/ai/generate-site', input),
    siteCommand: (input) => send<AiSiteCommandResult>('/ai/site-command', input),
  };
};

/**
 * How the screen names the engine that answered. The built-in engine is honest
 * about being the offline one, so nobody mistakes its wording for a real model.
 */
export const aiProviderLabel = (provider: string): string => {
  if (provider === 'local') return translateNow('ai.provider.local');
  if (provider === 'demo') return translateNow('ai.provider.demo');
  return translateNow('ai.provider.other');
};

/** All the changed rows of a proposal, ready for the diff dialog. */
export const aiProposalChanges = (proposal: AiProposal | null) => proposal?.changes ?? [];

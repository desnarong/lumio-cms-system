/**
 * Environment wiring for the AI assistant (docs/design/09-ai-assistant.md 9.4).
 * The provider sits behind one interface, so swapping the engine (or running the
 * built-in local one) never touches the service, the controller or the screens.
 */

export type AiProviderName = 'local' | 'openai';

export const aiProviderName = (): AiProviderName =>
  process.env.AI_PROVIDER?.trim().toLowerCase() === 'openai' ? 'openai' : 'local';

export const aiBaseUrl = (): string =>
  (process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');

export const aiApiKey = (): string => process.env.AI_API_KEY?.trim() ?? '';

export const aiModel = (): string => process.env.AI_MODEL?.trim() || 'gpt-4o-mini';

export const aiTimeoutMs = (): number => {
  const value = Number(process.env.AI_TIMEOUT_MS ?? '20000');
  return Number.isFinite(value) && value > 0 ? value : 20_000;
};

/** Results are cached by prompt+context hash; this bounds the cache size. */
export const aiCacheTtlMs = (): number => 30 * 60_000;
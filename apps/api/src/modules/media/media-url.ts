import { mediaPublicBaseUrl } from './media.config';

export interface MediaLike {
  storageKey: string;
  variants: unknown;
  status?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Public URL of a ready media row, or `null` when the file is trashed/missing.
 * Product cards need exactly the same rule as page covers, so both use this.
 */
export const toPublicMediaUrl = (
  media: MediaLike | null | undefined,
  baseUrl: string = mediaPublicBaseUrl(),
): string | null => {
  if (!media || media.status === 'trashed') return null;
  const variants = Array.isArray(media.variants) ? media.variants : [];
  const first = asRecord(variants[0]);
  const key = typeof first.url === 'string' && first.url.length > 0 ? first.url : media.storageKey;
  return `${baseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
};

import {
  MEDIA_MAX_UPLOAD_BYTES,
  UPLOAD_MIME_TYPES,
  isUploadMimeType,
  type BrandPalette,
  type BulkMediaUpdateResult,
  type BulkUpdateMediaInput,
  type MediaItem,
  type PresignUploadResult,
  type UpdateMediaInput,
  type UploadMimeType,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../editor/api.js';

export interface MediaListQuery {
  q?: string;
  folder?: string;
  cursor?: string;
  limit?: number;
}

export interface MediaPage {
  items: MediaItem[];
  cursor: string | null;
}

/** Everything the media screens need, so tests can swap in a fake. */
export interface MediaApi {
  list(query?: MediaListQuery): Promise<MediaPage>;
  folders(): Promise<string[]>;
  /** Presigns, uploads the bytes and confirms: one call for the caller. */
  upload(file: File, options?: { folder?: string }): Promise<MediaItem>;
  update(id: string, input: UpdateMediaInput): Promise<MediaItem>;
  /** Describe several images and/or move them into one folder at once. */
  bulkUpdate(input: BulkUpdateMediaInput): Promise<BulkMediaUpdateResult>;
  /** Soft delete; pair it with `restore` from the undo toast. */
  remove(id: string): Promise<void>;
  restore(id: string): Promise<MediaItem>;
  /** Brand colours read from a logo, for the wizard's palette step. */
  palette(id: string): Promise<BrandPalette>;
}

/** Used for the file input's `accept` attribute. */
export const ACCEPTED_UPLOAD_TYPES = UPLOAD_MIME_TYPES.join(',');

export const UPLOAD_SIZE_LABEL = `${Math.round(MEDIA_MAX_UPLOAD_BYTES / (1024 * 1024))} MB`;

const EXTENSION_MIME: Record<string, UploadMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
};

/**
 * Some browsers report an empty mime type for dragged files, so the extension
 * is used as a fallback. The API still sniffs the real bytes on the way in.
 */
export const mimeFromFilename = (filename: string): UploadMimeType | null => {
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  return EXTENSION_MIME[ext] ?? null;
};

export interface UploadCandidate {
  name: string;
  type: string;
  size: number;
}

/** Instant, human-readable feedback before a single byte is uploaded. */
export const checkUploadCandidate = (file: UploadCandidate): string | null => {
  const mime = isUploadMimeType(file.type) ? file.type : mimeFromFilename(file.name);
  if (!mime) return translateNow('media.unsupportedType');
  if (file.size > MEDIA_MAX_UPLOAD_BYTES)
    return translateNow('media.tooLarge', { limit: UPLOAD_SIZE_LABEL });
  if (file.size === 0) return translateNow('media.emptyFile');
  return null;
};

interface Envelope<T> {
  data: T;
  meta?: { cursor?: string | null };
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpMediaApiConfig {
  /** API origin, e.g. `http://localhost:49100`. Empty string keeps requests same-origin. */
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/**
 * Talks to `/api/v1/media`. The site always travels in `X-Site-Id`, because
 * `/media/:mediaId` uses its path parameter for the file, not the site.
 */
export const createHttpMediaApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpMediaApiConfig): MediaApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> => {
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

    return (payload as Envelope<T>) ?? { data: undefined as T };
  };

  const upload = async (file: File, options?: { folder?: string }): Promise<MediaItem> => {
    const invalid = checkUploadCandidate(file);
    if (invalid) throw new ApiError('validation_error', invalid, 400);

    const mime = isUploadMimeType(file.type) ? file.type : mimeFromFilename(file.name);
    if (!mime) throw new ApiError('validation_error', translateNow('media.unknownType'), 400);

    const presigned = (
      await request<PresignUploadResult>('/media/presign', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mime,
          size: file.size,
          ...(options?.folder ? { folder: options.folder } : {}),
        }),
      })
    ).data;

    // Step 3 of docs/design/12-api.md 12.6: the bytes go straight to storage,
    // signed by the URL itself, so no session headers are sent.
    const put = await doFetch(presigned.uploadUrl, {
      method: presigned.method,
      headers: presigned.headers,
      body: file,
    });
    if (!put.ok) {
      throw new ApiError('upload_failed', translateNow('media.uploadFailed'), put.status);
    }

    return (
      await request<MediaItem>(`/media/${presigned.mediaId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ folder: options?.folder }),
      })
    ).data;
  };

  return {
    list: async (query = {}) => {
      const params = new URLSearchParams();
      if (query.q) params.set('q', query.q);
      if (query.folder) params.set('folder', query.folder);
      if (query.cursor) params.set('cursor', query.cursor);
      params.set('limit', String(query.limit ?? 40));

      const envelope = await request<MediaItem[]>(`/media?${params.toString()}`);
      return { items: envelope.data, cursor: envelope.meta?.cursor ?? null };
    },
    folders: async () => (await request<{ folders: string[] }>('/media/folders')).data.folders,
    upload,
    update: async (id, input) =>
      (await request<MediaItem>(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(input) }))
        .data,
    bulkUpdate: async (input) =>
      (await request<BulkMediaUpdateResult>('/media/bulk', {
        method: 'PATCH',
        body: JSON.stringify(input),
      })).data,
    remove: async (id) => {
      await request<{ success: boolean }>(`/media/${id}`, { method: 'DELETE' });
    },
    restore: async (id) =>
      (await request<MediaItem>(`/media/${id}/restore`, { method: 'POST' })).data,
    palette: async (id) =>
      (await request<BrandPalette>(`/media/${id}/palette`, { method: 'POST' })).data,
  };
};
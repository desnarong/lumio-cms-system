import type {
  InstalledPack,
  MarketplaceInstallInput,
  MarketplacePack,
  MarketplaceView,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import { readAdminLocale } from '../shell/locale-preference.js';

/**
 * The block marketplace (docs/PROGRESS.md "ก้อนถัดไป B"): the official
 * catalogue, the packs this site installed, and the install-from-token flow.
 */
export interface MarketplaceApi {
  view(): Promise<MarketplaceView>;
  /** Checks a signed token before installing anything. */
  preview(token: string): Promise<MarketplacePack>;
  install(input: MarketplaceInstallInput): Promise<InstalledPack>;
  setEnabled(packKey: string, enabled: boolean): Promise<InstalledPack>;
  remove(packKey: string): Promise<void>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpMarketplaceApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Talks to `/api/v1/marketplace` (site always sent as `X-Site-Id`). */
export const createHttpMarketplaceApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpMarketplaceApiConfig): MarketplaceApi => {
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
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return (payload as Envelope<T>).data;
  };

  return {
    view: () => request<MarketplaceView>('/marketplace'),
    preview: (token) =>
      request<MarketplacePack>('/marketplace/preview', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    install: (input) =>
      request<InstalledPack>('/marketplace/installs', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    setEnabled: (packKey, enabled) =>
      request<InstalledPack>(`/marketplace/installs/${encodeURIComponent(packKey)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    remove: async (packKey) => {
      await request<{ success: boolean }>(`/marketplace/installs/${encodeURIComponent(packKey)}`, {
        method: 'DELETE',
      });
    },
  };
};

/** In-memory marketplace so the whole screen can be walked through offline. */
export const createDemoMarketplaceApi = (): MarketplaceApi => {
  const now = new Date().toISOString();
  const catalog: MarketplaceView['catalog'] = [
    {
      key: 'lumio-launch',
      name: 'ชุดเปิดตัวเว็บ',
      nameEn: 'Website launch pack',
      description: 'หน้าแรกพร้อมใช้: ส่วนต้อนรับ จุดเด่น และปุ่มพาไปหน้าถัดไป',
      descriptionEn: 'A ready home page: hero, three selling points and a call to action',
      version: '1.1.0',
      author: 'Lumio',
      homepage: null,
      license: 'CC BY 4.0',
      source: 'official',
      sectionCount: 2,
      installed: false,
      installedVersion: null,
      enabled: false,
      updateAvailable: false,
    },
    {
      key: 'lumio-story',
      name: 'ชุดเรื่องราวธุรกิจ',
      nameEn: 'Business story pack',
      description: 'เล่าเรื่องที่มาของธุรกิจและทีมงาน ให้ลูกค้าเห็นว่าคุณเป็นใคร',
      descriptionEn: 'Tells where the business comes from and who is behind it',
      version: '1.0.0',
      author: 'Lumio',
      homepage: null,
      license: 'CC BY 4.0',
      source: 'official',
      sectionCount: 2,
      installed: false,
      installedVersion: null,
      enabled: false,
      updateAvailable: false,
    },
  ];

  let installed: InstalledPack[] = [];

  const toInstalled = (key: string, version: string): InstalledPack => ({
    key,
    name: catalog.find((entry) => entry.key === key)?.name ?? key,
    version,
    source: 'official',
    enabled: true,
    sectionCount: catalog.find((entry) => entry.key === key)?.sectionCount ?? 0,
    signed: false,
    installedAt: now,
    updatedAt: now,
  });

  const withState = (): MarketplaceView => ({
    catalog: catalog.map((entry) => {
      const current = installed.find((item) => item.key === entry.key);
      return {
        ...entry,
        installed: Boolean(current),
        installedVersion: current?.version ?? null,
        enabled: current?.enabled ?? false,
        updateAvailable: false,
      };
    }),
    installed,
  });

  return {
    view: async () => withState(),
    preview: async () => {
      throw new ApiError('validation_error', translateNow('marketplace.demoPreview'), 400);
    },
    install: async (input) => {
      if (input.token !== undefined) {
        throw new ApiError('validation_error', translateNow('marketplace.demoPreview'), 400);
      }
      const entry = catalog.find((item) => item.key === input.key);
      if (!entry) throw new ApiError('not_found', translateNow('marketplace.notFound'), 404);
      if (installed.some((item) => item.key === entry.key)) {
        throw new ApiError('conflict', translateNow('marketplace.alreadyInstalled'), 409);
      }
      const created = toInstalled(entry.key, entry.version);
      installed = [created, ...installed];
      return created;
    },
    setEnabled: async (packKey, enabled) => {
      const current = installed.find((item) => item.key === packKey);
      if (!current) throw new ApiError('not_found', translateNow('marketplace.notFound'), 404);
      const updated = { ...current, enabled };
      installed = installed.map((item) => (item.key === packKey ? updated : item));
      return updated;
    },
    remove: async (packKey) => {
      if (!installed.some((item) => item.key === packKey)) {
        throw new ApiError('not_found', translateNow('marketplace.notFound'), 404);
      }
      installed = installed.filter((item) => item.key !== packKey);
    },
  };
};

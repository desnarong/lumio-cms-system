import { translateNow } from '@lumio/ui';
import type { AuthApi } from './auth/api.js';
import { createHttpAuthApi } from './auth/api.js';
import { createDemoAuthApi, DEMO_EMAIL, DEMO_PASSWORD } from './auth/demo.js';
import { createSessionFetch } from './auth/session-fetch.js';
import { createSessionStore, type KeyValueStorage, type SessionStore } from './auth/session.js';
import type { AiApi } from './ai/api.js';
import { createHttpAiApi } from './ai/api.js';
import { createDemoAiApi } from './ai/demo.js';
import type { CommerceApi } from './commerce/api.js';
import { createHttpCommerceApi } from './commerce/api.js';
import { createDemoCommerceApi } from './commerce/demo.js';
import type { DashboardApi } from './dashboard/api.js';
import { createHttpDashboardApi } from './dashboard/api.js';
import { createDemoDashboardApi } from './dashboard/demo.js';
import type { DesignApi } from './design/api.js';
import { createHttpDesignApi } from './design/api.js';
import { createDemoDesignApi } from './design/demo.js';
import type { ContentApi } from './editor/api.js';
import { createHttpContentApi } from './editor/api.js';
import { createDemoContentApi } from './editor/demo.js';
import type { SectionTemplateApi } from './editor/sections.js';
import { createDemoSectionTemplateApi, createHttpSectionTemplateApi } from './editor/sections.js';
import type { FormsApi } from './forms/api.js';
import { createHttpFormsApi } from './forms/api.js';
import { createDemoFormsApi } from './forms/demo.js';
import type { AnalyticsApi, AppsApi, NewsletterApi, SeoApi } from './growth/api.js';
import {
  createHttpAnalyticsApi,
  createHttpAppsApi,
  createHttpNewsletterApi,
  createHttpSeoApi,
} from './growth/api.js';
import {
  createDemoAnalyticsApi,
  createDemoAppsApi,
  createDemoNewsletterApi,
  createDemoSeoApi,
} from './growth/demo.js';
import type { MembershipApi } from './membership/api.js';
import { createHttpMembershipApi } from './membership/api.js';
import { createDemoMembershipApi } from './membership/demo.js';
import type { ApiKeysApi } from './settings/api-keys.js';
import { createDemoApiKeysApi, createHttpApiKeysApi } from './settings/api-keys.js';
import type { LicenseApi } from './settings/license.js';
import { createDemoLicenseApi, createHttpLicenseApi } from './settings/license.js';
import type { AgencyApi } from './settings/branding.js';
import { createDemoAgencyApi, createHttpAgencyApi } from './settings/branding.js';
import type { BookingApi } from './booking/api.js';
import { createDemoBookingApi, createHttpBookingApi } from './booking/api.js';
import type { MarketplaceApi } from './marketplace/api.js';
import { createDemoMarketplaceApi, createHttpMarketplaceApi } from './marketplace/api.js';
import type { MediaApi } from './media/api.js';
import { createHttpMediaApi } from './media/api.js';
import { createDemoMediaApi } from './media/demo.js';
import type { SettingsApi } from './settings/api.js';
import { createHttpSettingsApi } from './settings/api.js';
import { createDemoSettingsApi } from './settings/demo.js';
import type { BillingApi } from './settings/billing.js';
import { createDemoBillingApi, createHttpBillingApi } from './settings/billing.js';
import type { WizardApi } from './wizard/api.js';
import { createHttpWizardApi } from './wizard/api.js';
import { createDemoWizardApi } from './wizard/demo.js';
import type { UpdatesApi } from './updates/api.js';
import { createHttpUpdatesApi } from './updates/api.js';
import { createDemoUpdatesApi } from './updates/demo.js';

export interface LogoUpload {
  mediaId: string;
  url: string;
}

/** Everything the admin talks to, in one object the shell can be handed. */
export interface AdminClients {
  /** True when no API is configured and every client is in-memory. */
  demo: boolean;
  session: SessionStore;
  auth: AuthApi;
  /** The AI assistant, shared by the editor and the media library. */
  ai: AiApi;
  wizard: WizardApi;
  content: ContentApi;
  sections: SectionTemplateApi;
  forms: FormsApi;
  media: MediaApi;
  dashboard: DashboardApi;
  commerce: CommerceApi;
  /** Reader accounts and paid memberships (docs/PROGRESS.md batch A). */
  membership: MembershipApi;
  /** Section packs from the block marketplace (docs/PROGRESS.md batch B). */
  marketplace: MarketplaceApi;
  /** Appointment booking (docs/PROGRESS.md "งานนอก MVP"). */
  booking: BookingApi;
  /** Public API keys of this site. */
  apiKeys: ApiKeysApi;
  /** White-label branding of the installation. */
  agency: AgencyApi;
  /** The deployment licence (ตั้งค่า › ไลเซนส์). */
  license: LicenseApi;
  design: DesignApi;
  settings: SettingsApi;
  billing: BillingApi;
  seo: SeoApi;
  analytics: AnalyticsApi;
  newsletter: NewsletterApi;
  apps: AppsApi;
  /** Installed version and the newest release the server knows about. */
  updates: UpdatesApi;
  /** Step 2 of the wizard uploads the logo through the media library. */
  uploadLogo?: (file: File) => Promise<LogoUpload>;
  demoHint?: string;
}

export interface AdminClientOptions {
  /** API origin from `VITE_API_URL`; empty string means demo mode. */
  apiUrl: string;
  storage?: KeyValueStorage;
  /** Called after a 401 that the refresh token could not recover. */
  onSessionExpired?: () => void;
}

/**
 * Builds the clients for one session. With no API URL the admin runs entirely
 * in memory (demo sign-in, demo templates, demo library), so the whole flow can
 * be walked through before a backend exists.
 */
export const createAdminClients = ({
  apiUrl,
  storage,
  onSessionExpired,
}: AdminClientOptions): AdminClients => {
  const baseUrl = apiUrl.replace(/\/+$/, '');
  const session = createSessionStore(storage);
  const getAccessToken = (): string | null => session.read()?.accessToken ?? null;
  const getSiteId = (): string | null => session.read()?.siteId ?? null;

  if (baseUrl.length === 0) {
    const media = createDemoMediaApi();
    const wizard = createDemoWizardApi();
    const ai = createDemoAiApi();
    const content = createDemoContentApi();

    return {
      demo: true,
      session,
      auth: createDemoAuthApi(),
      ai,
      wizard,
      content,
      sections: createDemoSectionTemplateApi(),
      forms: createDemoFormsApi(),
      media,
      dashboard: createDemoDashboardApi(),
      commerce: createDemoCommerceApi(),
      membership: createDemoMembershipApi(),
      marketplace: createDemoMarketplaceApi(),
      booking: createDemoBookingApi(),
      apiKeys: createDemoApiKeysApi(),
      agency: createDemoAgencyApi(),
      license: createDemoLicenseApi(),
      design: createDemoDesignApi(),
      settings: createDemoSettingsApi({ media }),
      billing: createDemoBillingApi(),
      seo: createDemoSeoApi(ai),
      analytics: createDemoAnalyticsApi(),
      newsletter: createDemoNewsletterApi(),
      apps: createDemoAppsApi(),
      updates: createDemoUpdatesApi(),
      uploadLogo: async (file) => {
        const item = await media.upload(file, { folder: 'brand' });
        return { mediaId: item.id, url: item.url ?? '' };
      },
      demoHint: translateNow('app.demoHint', { email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    };
  }

  const fetchImpl = createSessionFetch({
    baseUrl,
    session,
    ...(onSessionExpired ? { onExpired: onSessionExpired } : {}),
  });

  const media = createHttpMediaApi({ baseUrl, getAccessToken, getSiteId, fetchImpl });
  const ai = createHttpAiApi({ baseUrl, getAccessToken, getSiteId, fetchImpl });
  const content = createHttpContentApi({ baseUrl, getAccessToken, getSiteId, fetchImpl });

  return {
    demo: false,
    session,
    auth: createHttpAuthApi({ baseUrl, getAccessToken, fetchImpl }),
    ai,
    wizard: createHttpWizardApi({ baseUrl, getAccessToken, fetchImpl }),
    content,
    sections: createHttpSectionTemplateApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    forms: createHttpFormsApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    media,
    dashboard: createHttpDashboardApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    commerce: createHttpCommerceApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    membership: createHttpMembershipApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    marketplace: createHttpMarketplaceApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    booking: createHttpBookingApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    apiKeys: createHttpApiKeysApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    agency: createHttpAgencyApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    license: createHttpLicenseApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    design: createHttpDesignApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    settings: createHttpSettingsApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    billing: createHttpBillingApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    seo: createHttpSeoApi({ baseUrl, getAccessToken, getSiteId, ai, content, fetchImpl }),
    analytics: createHttpAnalyticsApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    newsletter: createHttpNewsletterApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    apps: createHttpAppsApi({ baseUrl, getAccessToken, getSiteId, fetchImpl }),
    updates: createHttpUpdatesApi({ baseUrl, getAccessToken, fetchImpl }),
    uploadLogo: async (file) => {
      const item = await media.upload(file, { folder: 'brand' });
      return { mediaId: item.id, url: item.url ?? '' };
    },
  };
};

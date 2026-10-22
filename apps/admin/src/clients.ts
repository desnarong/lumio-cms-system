import { translateNow } from '@lumio/ui';
import type { AuthApi } from './auth/api.js';
import { createHttpAuthApi } from './auth/api.js';
import { createDemoAuthApi, DEMO_EMAIL, DEMO_PASSWORD } from './auth/demo.js';
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
  design: DesignApi;
  settings: SettingsApi;
  billing: BillingApi;
  seo: SeoApi;
  analytics: AnalyticsApi;
  newsletter: NewsletterApi;
  apps: AppsApi;
  /** Step 2 of the wizard uploads the logo through the media library. */
  uploadLogo?: (file: File) => Promise<LogoUpload>;
  demoHint?: string;
}

export interface AdminClientOptions {
  /** API origin from `VITE_API_URL`; empty string means demo mode. */
  apiUrl: string;
  storage?: KeyValueStorage;
}

/**
 * Builds the clients for one session. With no API URL the admin runs entirely
 * in memory (demo sign-in, demo templates, demo library), so the whole flow can
 * be walked through before a backend exists.
 */
export const createAdminClients = ({ apiUrl, storage }: AdminClientOptions): AdminClients => {
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
      design: createDemoDesignApi(),
      settings: createDemoSettingsApi(),
      billing: createDemoBillingApi(),
      seo: createDemoSeoApi(ai),
      analytics: createDemoAnalyticsApi(),
      newsletter: createDemoNewsletterApi(),
      apps: createDemoAppsApi(),
      uploadLogo: async (file) => {
        const item = await media.upload(file, { folder: 'brand' });
        return { mediaId: item.id, url: item.url ?? '' };
      },
      demoHint: translateNow('app.demoHint', { email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    };
  }

  const media = createHttpMediaApi({ baseUrl, getAccessToken, getSiteId });
  const ai = createHttpAiApi({ baseUrl, getAccessToken, getSiteId });
  const content = createHttpContentApi({ baseUrl, getAccessToken, getSiteId });

  return {
    demo: false,
    session,
    auth: createHttpAuthApi({ baseUrl, getAccessToken }),
    ai,
    wizard: createHttpWizardApi({ baseUrl, getAccessToken }),
    content,
    sections: createHttpSectionTemplateApi({ baseUrl, getAccessToken, getSiteId }),
    forms: createHttpFormsApi({ baseUrl, getAccessToken, getSiteId }),
    media,
    dashboard: createHttpDashboardApi({ baseUrl, getAccessToken, getSiteId }),
    commerce: createHttpCommerceApi({ baseUrl, getAccessToken, getSiteId }),
    design: createHttpDesignApi({ baseUrl, getAccessToken, getSiteId }),
    settings: createHttpSettingsApi({ baseUrl, getAccessToken, getSiteId }),
    billing: createHttpBillingApi({ baseUrl, getAccessToken, getSiteId }),
    seo: createHttpSeoApi({ baseUrl, getAccessToken, getSiteId, ai, content }),
    analytics: createHttpAnalyticsApi({ baseUrl, getAccessToken, getSiteId }),
    newsletter: createHttpNewsletterApi({ baseUrl, getAccessToken, getSiteId }),
    apps: createHttpAppsApi({ baseUrl, getAccessToken, getSiteId }),
    uploadLogo: async (file) => {
      const item = await media.upload(file, { folder: 'brand' });
      return { mediaId: item.id, url: item.url ?? '' };
    },
  };
};

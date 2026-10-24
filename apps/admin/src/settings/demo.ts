import { translateNow } from '@lumio/ui';
import type {
  ContentSummary,
  DomainSummary,
  MemberSummary,
  BackupOverview,
  BackupScheduleInput,
  BackupSnapshot,
  EmailSettingsInput,
  EmailSettingsView,
  FeatureFlagList,
  PublishSettingsInput,
  PublishSettingsView,
  RedirectRule,
  SiteFeatureFlags,
  SiteSummary,
} from '@lumio/shared';
import { FEATURE_FLAG_KEYS, FEATURE_FLAG_META, normalizeLocales, SITE_EXPORT_VERSION } from '@lumio/shared';
import { ApiError } from '../api-error.js';
import type { MediaApi } from '../media/api.js';
import type { SettingsApi } from './api.js';

const DEMO_SITE_ID = 'demo-site-1';

const demoMember = (index: number, role: MemberSummary['role']): MemberSummary => ({
  userId: `demo-user-${index}`,
  email: index === 1 ? 'owner@example.com' : `teammate${index}@example.com`,
  name: index === 1 ? 'สมชาย' : `ทีมงาน ${index}`,
  avatarUrl: null,
  role,
  joinedAt: new Date().toISOString(),
});

/** One trashed page so the backup tab has something to show before the API is up. */
const demoTrash = (): ContentSummary => ({
  id: 'demo-trash-1',
  type: 'page',
  title: 'หน้าโปรโมชันเก่า',
  slug: 'old-promo',
  status: 'archived',
  locale: 'th',
  translationGroupId: 'demo-trash-1',
  excerpt: null,
  revision: 4,
  updatedAt: '2026-10-10T09:00:00.000Z',
  publishedAt: '2026-09-01T09:00:00.000Z',
  archivedAt: '2026-10-10T09:00:00.000Z',
});

/** In-memory settings backend so the screens work before the API is up. */
export const createDemoSettingsApi = ({ media }: { media?: MediaApi } = {}): SettingsApi => {
  let brand: Record<string, unknown> = {};
  let site: SiteSummary = {
    id: DEMO_SITE_ID,
    name: 'กาแฟบ้านดอย',
    subdomain: 'baandoi',
    localeDefault: 'th',
    locales: ['th'],
    plan: 'pro',
    role: 'owner',
    createdAt: new Date().toISOString(),
    logoUrl: null,
    faviconUrl: null,
  };

  const brandUrl = async (value: unknown): Promise<string | null> => {
    if (typeof value !== 'string' || !media) return null;
    const page = await media.list({ limit: 100 });
    return page.items.find((item) => item.id === value)?.url ?? null;
  };

  const withBrand = async (): Promise<SiteSummary> => ({
    ...site,
    logoUrl: await brandUrl(brand.logoMediaId),
    faviconUrl: await brandUrl(brand.faviconMediaId),
  });

  let domains: DomainSummary[] = [];
  let members: MemberSummary[] = [demoMember(1, 'owner'), demoMember(2, 'editor')];
  let trash: ContentSummary[] = [demoTrash()];
  let redirects: RedirectRule[] = [
    {
      fromPath: '/promo-2025',
      toPath: '/promotions',
      code: 301,
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    },
  ];
  let email: EmailSettingsView = {
    enabled: false,
    provider: 'smtp',
    fromName: 'กาแฟบ้านดอย',
    fromEmail: 'hello@baandoi.com',
    notifyEmails: ['owner@baandoi.com'],
    smtp: { host: 'smtp.baandoi.com', port: 465, secure: true, username: 'hello@baandoi.com', hasPassword: false },
    resend: { hasApiKey: false },
    platformReady: true,
    ready: false,
    updatedAt: null,
  };
  let publish: PublishSettingsView = {
    rendererUrl: '',
    staticPublishUrl: '',
    hasStaticPublishSecret: false,
    cdnPurgeUrl: '',
    hasCdnPurgeSecret: false,
    purgeOnPublish: true,
    staticReady: false,
    purgeReady: false,
    lastRun: null,
    updatedAt: null,
  };
  let features: SiteFeatureFlags = {};
  const featureList = (): FeatureFlagList => ({
    items: FEATURE_FLAG_KEYS.map((key) => {
      const paid = FEATURE_FLAG_META[key].requiresLicense;
      return {
        key,
        enabled: paid ? false : (features[key] ?? true),
        lockedByPlatform: false,
        lockedByLicense: paid,
      };
    }),
  });
  let backupSchedule = { enabled: true, hour: 3, retentionDays: 14 };
  let backupItems: BackupSnapshot[] = [
    {
      id: 'demo-backup-1',
      filename: 'baandoi-backup-2026-10-21.json',
      sizeBytes: 248_000,
      kind: 'auto',
      createdAt: '2026-10-21T03:00:00.000Z',
    },
  ];
  const now = (): string => new Date().toISOString();

  return {
    getSite: async () => withBrand(),
    updateSite: async (input) => {
      const localeDefault = input.localeDefault ?? site.localeDefault;
      site = {
        ...site,
        name: input.name ?? site.name,
        subdomain: input.subdomain ?? site.subdomain,
        localeDefault,
        locales: input.locales ? normalizeLocales(input.locales, localeDefault) : site.locales,
      };
      if (input.settings) brand = { ...brand, ...input.settings };
      return withBrand();
    },

    listDomains: async () => ({
      items: domains,
      cnameTarget: `${site.subdomain}.example.com`,
    }),
    addDomain: async (input) => {
      if (domains.some((domain) => domain.hostname === input.hostname)) {
        throw new ApiError('conflict', translateNow('demo.domainTaken'), 409);
      }
      const created: DomainSummary = {
        id: `demo-domain-${domains.length + 1}`,
        hostname: input.hostname,
        isPrimary: input.isPrimary,
        sslStatus: 'pending',
        verifiedAt: null,
        createdAt: new Date().toISOString(),
      };
      domains = [...domains, created];
      return created;
    },
    verifyDomain: async (domainId) => {
      const found = domains.find((domain) => domain.id === domainId);
      if (!found) throw new ApiError('not_found', translateNow('demo.domainNotFound'), 404);
      return { verified: false, domain: found };
    },
    removeDomain: async (domainId) => {
      domains = domains.filter((domain) => domain.id !== domainId);
    },

    listRedirects: async () => ({ items: redirects }),
    createRedirect: async (input) => {
      if (redirects.some((rule) => rule.fromPath === input.fromPath)) {
        throw new ApiError('conflict', translateNow('settings.redirects.duplicate'), 409);
      }
      const created: RedirectRule = { ...input, createdAt: now(), updatedAt: now() };
      redirects = [...redirects, created].sort((a, b) => a.fromPath.localeCompare(b.fromPath));
      return created;
    },
    updateRedirect: async (input) => {
      const found = redirects.find((rule) => rule.fromPath === input.fromPath);
      if (!found) throw new ApiError('not_found', translateNow('settings.redirects.emptyTitle'), 404);
      const updated: RedirectRule = {
        ...found,
        toPath: input.toPath,
        code: input.code,
        updatedAt: now(),
      };
      redirects = redirects.map((rule) => (rule.fromPath === input.fromPath ? updated : rule));
      return updated;
    },
    removeRedirect: async (fromPath) => {
      redirects = redirects.filter((rule) => rule.fromPath !== fromPath);
    },

    listMembers: async () => members,
    inviteMember: async (input) => {
      const created = { ...demoMember(members.length + 1, input.role), email: input.email };
      members = [...members, created];
      return created;
    },
    updateMemberRole: async (userId, input) => {
      const found = members.find((member) => member.userId === userId);
      if (!found) throw new ApiError('not_found', translateNow('demo.memberNotFound'), 404);
      const updated = { ...found, role: input.role };
      members = members.map((member) => (member.userId === userId ? updated : member));
      return updated;
    },
    removeMember: async (userId) => {
      members = members.filter((member) => member.userId !== userId);
    },

    listTrash: async () => trash,
    restoreFromTrash: async (contentId) => {
      const found = trash.find((item) => item.id === contentId);
      if (!found) throw new ApiError('not_found', translateNow('demo.trashItemNotFound'), 404);
      trash = trash.filter((item) => item.id !== contentId);
    },
    purgeFromTrash: async (contentId) => {
      trash = trash.filter((item) => item.id !== contentId);
    },

    exportBackup: async () => ({
      filename: `${site.subdomain}-backup-${new Date().toISOString().slice(0, 10)}.json`,
      content: JSON.stringify(
        {
          version: SITE_EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          site: {
            name: site.name,
            subdomain: site.subdomain,
            localeDefault: site.localeDefault,
            locales: site.locales,
            plan: site.plan,
            themeTokens: {},
            settings: {},
          },
          contents: [],
          menus: [],
          globalBlocks: [],
          sectionTemplates: [],
          forms: [],
          subscribers: [],
          domains: [],
          members: [],
          products: [],
          orders: [],
          media: [],
        },
        null,
        2,
      ),
    }),
    getFeatures: async (): Promise<FeatureFlagList> => featureList(),
    updateFeatures: async (input) => {
      features = { ...features, ...input.flags };
      return featureList();
    },
    getBackupOverview: async (): Promise<BackupOverview> => ({
      schedule: {
        ...backupSchedule,
        lastRunAt: backupItems[0]?.createdAt ?? null,
      },
      items: backupItems,
    }),
    updateBackupSchedule: async (input: BackupScheduleInput) => {
      backupSchedule = input;
      return {
        schedule: { ...backupSchedule, lastRunAt: backupItems[0]?.createdAt ?? null },
        items: backupItems,
      };
    },
    createBackupSnapshot: async (): Promise<BackupSnapshot> => {
      const snapshot: BackupSnapshot = {
        id: `demo-backup-${backupItems.length + 1}`,
        filename: `${site.subdomain}-backup-${new Date().toISOString().slice(0, 10)}.json`,
        sizeBytes: 248_000,
        kind: 'manual',
        createdAt: now(),
      };
      backupItems = [snapshot, ...backupItems];
      return snapshot;
    },
    downloadBackupSnapshot: async () => ({
      filename: `${site.subdomain}-backup.json`,
      content: JSON.stringify({ version: SITE_EXPORT_VERSION, site: { name: site.name } }, null, 2),
    }),
    getEmailSettings: async () => email,
    updateEmailSettings: async (input: EmailSettingsInput) => {
      email = {
        ...email,
        enabled: input.enabled,
        provider: input.provider,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        notifyEmails: input.notifyEmails,
        smtp: {
          ...email.smtp,
          host: input.smtp?.host ?? email.smtp.host,
          port: input.smtp?.port ?? email.smtp.port,
          secure: input.smtp?.secure ?? email.smtp.secure,
          username: input.smtp?.username ?? email.smtp.username,
          hasPassword: email.smtp.hasPassword || Boolean(input.smtp?.password),
        },
        resend: { hasApiKey: email.resend.hasApiKey || Boolean(input.resend?.apiKey) },
        ready: input.enabled,
        updatedAt: now(),
      };
      return email;
    },
    testEmail: async (to) => ({
      sent: true,
      message: translateNow('settings.email.demoSent', { to }),
    }),
    getPublishSettings: async () => publish,
    updatePublishSettings: async (input: PublishSettingsInput) => {
      const keepStatic = publish.hasStaticPublishSecret && !input.clearStaticPublishSecret;
      const keepPurge = publish.hasCdnPurgeSecret && !input.clearCdnPurgeSecret;
      publish = {
        rendererUrl: input.rendererUrl,
        staticPublishUrl: input.staticPublishUrl,
        hasStaticPublishSecret: input.clearStaticPublishSecret ? false : keepStatic || Boolean(input.staticPublishSecret),
        cdnPurgeUrl: input.cdnPurgeUrl,
        hasCdnPurgeSecret: input.clearCdnPurgeSecret ? false : keepPurge || Boolean(input.cdnPurgeSecret),
        purgeOnPublish: input.purgeOnPublish,
        staticReady: input.rendererUrl.length > 0 && input.staticPublishUrl.length > 0,
        purgeReady: input.purgeOnPublish && input.cdnPurgeUrl.length > 0,
        lastRun: publish.lastRun,
        updatedAt: now(),
      };
      return publish;
    },
    testPublish: async () => ({
      ok: false,
      message: translateNow('demo.publishTest'),
      durationMs: 0,
    }),
    importBackup: async (input) => ({
      contents: { added: input.contents.length, skipped: 0 },
      menus: input.menus.length,
      globalBlocks: input.globalBlocks.length,
      sectionTemplates: input.sectionTemplates.length,
      forms: input.forms.length,
      subscribers: { added: input.subscribers.length, skipped: 0 },
      domains: { added: input.domains.length, skipped: 0 },
      members: { added: input.members.length, skipped: 0 },
      products: { added: input.products.length, skipped: 0 },
      orders: { added: input.orders.length, skipped: 0 },
      media: { added: 0, skipped: 0 },
    }),
  };
};

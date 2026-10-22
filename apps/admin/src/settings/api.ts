import type {
  AddDomainInput,
  BackupOverview,
  BackupScheduleInput,
  BackupSnapshot,
  ContentSummary,
  CreateRedirectInput,
  DomainList,
  DomainSummary,
  DomainVerifyResult,
  EmailSettingsInput,
  EmailSettingsView,
  EmailTestResult,
  FeatureFlagList,
  InviteMemberInput,
  PublishSettingsInput,
  PublishSettingsView,
  PublishTestResult,
  MemberSummary,
  RedirectList,
  RedirectRule,
  SiteExportFile,
  SiteImportInput,
  SiteImportResult,
  SiteSummary,
  UpdateMemberInput,
  UpdateRedirectInput,
  UpdateFeatureFlagsInput,
  UpdateSiteInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Settings screens: general info, domains, team, backup and billing (05-admin-ia.md 5.1). */
export interface SettingsApi {
  getSite(): Promise<SiteSummary>;
  updateSite(input: UpdateSiteInput): Promise<SiteSummary>;
  listDomains(): Promise<DomainList>;
  addDomain(input: AddDomainInput): Promise<DomainSummary>;
  verifyDomain(domainId: string): Promise<DomainVerifyResult>;
  removeDomain(domainId: string): Promise<void>;
  /** Old addresses that send visitors to the page that replaced them. */
  listRedirects(): Promise<RedirectList>;
  createRedirect(input: CreateRedirectInput): Promise<RedirectRule>;
  updateRedirect(input: UpdateRedirectInput): Promise<RedirectRule>;
  removeRedirect(fromPath: string): Promise<void>;
  listMembers(): Promise<MemberSummary[]>;
  inviteMember(input: InviteMemberInput): Promise<MemberSummary>;
  updateMemberRole(userId: string, input: UpdateMemberInput): Promise<MemberSummary>;
  removeMember(userId: string): Promise<void>;
  /** Pages and posts waiting in the trash (05-admin-ia.md 5.1 "Backup & ประวัติเวอร์ชัน"). */
  listTrash(): Promise<ContentSummary[]>;
  restoreFromTrash(contentId: string): Promise<void>;
  /** Deletes a trashed page for good; the screen confirms first. */
  purgeFromTrash(contentId: string): Promise<void>;
  /** Downloads the whole site as one JSON file. */
  exportBackup(): Promise<SiteExportFile>;
  /** Merges a backup file back into this site without overwriting newer rows. */
  importBackup(input: SiteImportInput): Promise<SiteImportResult>;
  /** The mailbox this site sends from (ตั้งค่า › อีเมล). */
  getEmailSettings(): Promise<EmailSettingsView>;
  updateEmailSettings(input: EmailSettingsInput): Promise<EmailSettingsView>;
  testEmail(to: string): Promise<EmailTestResult>;
  /** Where this site's static files and CDN live (ตั้งค่า › การเผยแพร่). */
  getPublishSettings(): Promise<PublishSettingsView>;
  updatePublishSettings(input: PublishSettingsInput): Promise<PublishSettingsView>;
  /** Uploads the home page once to prove the CDN setup works. */
  testPublish(): Promise<PublishTestResult>;
  /** Which additions this site offers (ตั้งค่า › ส่วนเสริม). */
  getFeatures(): Promise<FeatureFlagList>;
  updateFeatures(input: UpdateFeatureFlagsInput): Promise<FeatureFlagList>;
  /** Automatic backups: schedule, recent snapshots and the last run. */
  getBackupOverview(): Promise<BackupOverview>;
  updateBackupSchedule(input: BackupScheduleInput): Promise<BackupOverview>;
  createBackupSnapshot(): Promise<BackupSnapshot>;
  downloadBackupSnapshot(snapshotId: string): Promise<SiteExportFile>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpSettingsApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** The API path needs the site id; failing loudly beats requesting `/sites/null`. */
const siteIdOrThrow = (getSiteId?: () => string | null): string => {
  const siteId = getSiteId?.() ?? null;
  if (!siteId) throw new ApiError('validation_error', translateNow('settings.noSite'), 400);
  return siteId;
};

/** Talks to `/sites/:id`, `/sites/:id/domains` and `/members`. */
export const createHttpSettingsApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpSettingsApiConfig): SettingsApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const send = async (path: string, init: RequestInit = {}): Promise<Envelope<unknown>> => {
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
      | Envelope<unknown>
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

    return payload as Envelope<unknown>;
  };

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> =>
    (await send(path, init)).data as T;

  return {
    getSite: async () => request<SiteSummary>(`/sites/${siteIdOrThrow(getSiteId)}`),
    updateSite: async (input) =>
      request<SiteSummary>(`/sites/${siteIdOrThrow(getSiteId)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),

    listDomains: async () => request<DomainList>(`/sites/${siteIdOrThrow(getSiteId)}/domains`),
    addDomain: async (input) =>
      request<DomainSummary>(`/sites/${siteIdOrThrow(getSiteId)}/domains`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    verifyDomain: async (domainId) =>
      request<DomainVerifyResult>(
        `/sites/${siteIdOrThrow(getSiteId)}/domains/${domainId}/verify`,
        { method: 'POST' },
      ),
    removeDomain: async (domainId) => {
      await request<{ success: boolean }>(
        `/sites/${siteIdOrThrow(getSiteId)}/domains/${domainId}`,
        { method: 'DELETE' },
      );
    },

    listRedirects: async () => request<RedirectList>('/redirects'),
    createRedirect: async (input) =>
      request<RedirectRule>('/redirects', { method: 'POST', body: JSON.stringify(input) }),
    updateRedirect: async (input) =>
      request<RedirectRule>('/redirects', { method: 'PATCH', body: JSON.stringify(input) }),
    removeRedirect: async (fromPath) => {
      await request<{ success: boolean }>(
        `/redirects?from=${encodeURIComponent(fromPath)}`,
        { method: 'DELETE' },
      );
    },

    listMembers: async () => {
      const payload = await send('/members?limit=100');
      return (payload.data ?? []) as MemberSummary[];
    },
    inviteMember: async (input) =>
      request<MemberSummary>('/members', { method: 'POST', body: JSON.stringify(input) }),
    updateMemberRole: async (userId, input) =>
      request<MemberSummary>(`/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    removeMember: async (userId) => {
      await request<{ success: boolean }>(`/members/${userId}`, { method: 'DELETE' });
    },

    listTrash: async () => {
      const payload = await send('/contents?status=archived&limit=100');
      return (payload.data ?? []) as ContentSummary[];
    },
    restoreFromTrash: async (contentId) => {
      await request<unknown>(`/contents/${contentId}/restore`, { method: 'POST' });
    },
    purgeFromTrash: async (contentId) => {
      await request<{ success: boolean }>(`/contents/${contentId}`, { method: 'DELETE' });
    },

    exportBackup: async () => request<SiteExportFile>('/backup/export'),
    importBackup: async (input) =>
      request<SiteImportResult>('/backup/import', {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    getEmailSettings: async () => request<EmailSettingsView>('/email/settings'),
    updateEmailSettings: async (input) =>
      request<EmailSettingsView>('/email/settings', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    testEmail: async (to) =>
      request<EmailTestResult>('/email/test', {
        method: 'POST',
        body: JSON.stringify({ to }),
      }),
    getPublishSettings: async () => request<PublishSettingsView>('/publish/settings'),
    updatePublishSettings: async (input) =>
      request<PublishSettingsView>('/publish/settings', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    testPublish: async () =>
      request<PublishTestResult>('/publish/test', { method: 'POST' }),
    getFeatures: async () => request<FeatureFlagList>('/features'),
    updateFeatures: async (input) =>
      request<FeatureFlagList>('/features', { method: 'PATCH', body: JSON.stringify(input) }),
    getBackupOverview: async () => request<BackupOverview>('/backup/overview'),
    updateBackupSchedule: async (input) =>
      request<BackupOverview>('/backup/schedule', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    createBackupSnapshot: async () =>
      request<BackupSnapshot>('/backup/snapshots', { method: 'POST' }),
    downloadBackupSnapshot: async (snapshotId) =>
      request<SiteExportFile>(`/backup/snapshots/${snapshotId}`),
  };
};

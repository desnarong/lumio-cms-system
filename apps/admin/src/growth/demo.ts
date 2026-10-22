import { translateNow } from '@lumio/ui';
import {
  APP_CATALOG,
  analyticsRangeDays,
  deviceLabel,
  localizeCatalogApp,
  requiredScopeFor,
  seoGradeFor,
  seoIssueLabel,
  subscribersToCsv,
  type AnalyticsRange,
  type AnalyticsSummary,
  type AppStoreEntry,
  type InstalledApp,
  type SeoCheck,
  type SeoHealth,
  type Subscriber,
  type SubscriberStatus,
} from '@lumio/shared';
import { uiLocaleNow } from '@lumio/ui';
import type { AiApi } from '../ai/api.js';
import type {
  AnalyticsApi,
  AppsApi,
  NewsletterApi,
  SeoApi,
  SeoMetaInput,
} from './api.js';

const demoChecks = (): SeoCheck[] => [
  {
    kind: 'not_published',
    label: 'ยังไม่มีหน้าเว็บที่เผยแพร่',
    done: true,
    count: 0,
    impact: 'high',
    href: '/content/page',
    items: [],
  },
  {
    kind: 'missing_title',
    label: 'ยังไม่มีชื่อเรื่องสำหรับค้นหา',
    done: false,
    count: 1,
    impact: 'medium',
    href: '/content/page',
    items: [{ id: 'demo-page-2', title: 'บริการ' }],
  },
  {
    kind: 'missing_description',
    label: 'ยังไม่มีคำอธิบายหน้า',
    done: false,
    count: 2,
    impact: 'medium',
    href: '/content/page',
    items: [
      { id: 'demo-page-2', title: 'บริการ' },
      { id: 'demo-page-3', title: 'ติดต่อเรา' },
    ],
  },
  {
    kind: 'missing_h1',
    label: 'หน้ายังไม่มีหัวข้อหลัก',
    done: true,
    count: 0,
    impact: 'low',
    href: '/content/page',
    items: [],
  },
  {
    kind: 'missing_alt',
    label: 'รูปยังไม่มีคำอธิบายรูป',
    done: false,
    count: 3,
    impact: 'medium',
    href: '/content/media',
    items: [],
  },
  {
    kind: 'noindex',
    label: 'บางหน้าถูกตั้งให้ไม่แสดงในผลค้นหา',
    done: true,
    count: 0,
    impact: 'low',
    href: '/content/page',
    items: [],
  },
];

/**
 * Demo SEO report so the screen works before the API is configured. Meta the
 * assistant wrote is remembered here, so accepting a suggestion really does
 * clear the check and raise the score (undo puts it back).
 */
export const createDemoSeoApi = (ai: AiApi): SeoApi => {
  const saved = new Map<string, SeoMetaInput>();

  const health = (): SeoHealth => {
    const checks = demoChecks().map((check) => {
      const localized = { ...check, label: seoIssueLabel(check.kind, uiLocaleNow()) };
      if (check.kind !== 'missing_title' && check.kind !== 'missing_description') {
        return localized;
      }

      const items = check.items.filter((item) => !saved.has(item.id));
      const count = Math.max(0, check.count - (check.items.length - items.length));
      return { ...localized, items, count, done: count === 0 };
    });

    const score = Math.min(100, 78 + saved.size * 6);
    return { score, grade: seoGradeFor(score), publishedCount: 4, checks };
  };

  return {
    getHealth: async () => health(),
    getNotFound: async () => ({
      total: 27,
      items: [
        { path: '/promo-2025', hits: 18, lastSeenAt: '2026-10-21T09:00:00.000Z' },
        { path: '/old-menu', hits: 6, lastSeenAt: '2026-10-20T15:00:00.000Z' },
        { path: '/blog/เก่า', hits: 3, lastSeenAt: '2026-10-19T08:00:00.000Z' },
      ],
    }),
    suggestMeta: async (pageId) => (await ai.seo({ pageId })).proposal,
    saveMeta: async (pageId, meta) => {
      const previous = saved.get(pageId) ?? { title: '', description: '' };
      if (meta.title.trim().length === 0 && meta.description.trim().length === 0) {
        saved.delete(pageId);
      } else {
        saved.set(pageId, meta);
      }
      return { previous };
    },
  };
};

const demoSeries = (days: number) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 21 - (days - 1 - index)));
    const visitors = 120 + ((index * 37) % 90);
    return {
      date: date.toISOString().slice(0, 10),
      visitors,
      pageviews: visitors * 2 + 15,
    };
  });

/** Demo analytics so the chart and lists have something to show. */
export const createDemoAnalyticsApi = (): AnalyticsApi => ({
  getSummary: async (range: AnalyticsRange): Promise<AnalyticsSummary> => {
    const days = analyticsRangeDays(range);
    const series = demoSeries(days);
    const visitors = series.reduce((total, point) => total + point.visitors, 0);
    const pageviews = series.reduce((total, point) => total + point.pageviews, 0);
    const previousVisitors = Math.round(visitors * 0.88);

    return {
      range,
      days,
      visitors,
      pageviews,
      previousVisitors,
      changePercent: previousVisitors > 0 ? 13.6 : null,
      series,
      topPages: [
        { label: '/', value: Math.round(pageviews * 0.42) },
        { label: '/services', value: Math.round(pageviews * 0.24) },
        { label: '/menu', value: Math.round(pageviews * 0.16) },
        { label: '/contact', value: Math.round(pageviews * 0.1) },
      ],
      topReferrers: [
        { label: 'google.com', value: Math.round(visitors * 0.5) },
        { label: 'facebook.com', value: Math.round(visitors * 0.3) },
        { label: 'line.me', value: Math.round(visitors * 0.12) },
      ],
      devices: [
        { label: deviceLabel('mobile', uiLocaleNow()), value: Math.round(visitors * 0.68) },
        { label: deviceLabel('desktop', uiLocaleNow()), value: Math.round(visitors * 0.26) },
        { label: deviceLabel('tablet', uiLocaleNow()), value: Math.round(visitors * 0.06) },
      ],
    };
  },
});

const DEMO_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub-1',
    email: 'somchai@example.com',
    status: 'active',
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'sub-2',
    email: 'malee@example.com',
    status: 'active',
    createdAt: '2026-10-18T13:30:00.000Z',
  },
  {
    id: 'sub-3',
    email: 'arun@example.com',
    status: 'unsubscribed',
    createdAt: '2026-10-12T08:15:00.000Z',
  },
];

/** In-memory newsletter so add/remove/undo can be tried without a backend. */
export const createDemoNewsletterApi = (): NewsletterApi => {
  let subscribers = [...DEMO_SUBSCRIBERS];
  let counter = subscribers.length;

  return {
    list: async (query = {}) => {
      const filtered = subscribers.filter(
        (subscriber) =>
          (!query.status || subscriber.status === query.status) &&
          (!query.q || subscriber.email.includes(query.q.toLowerCase())),
      );
      return {
        items: filtered,
        cursor: null,
        total: filtered.length,
        activeCount: subscribers.filter((subscriber) => subscriber.status === 'active').length,
      };
    },
    add: async (input) => {
      counter += 1;
      const created: Subscriber = {
        id: `sub-${counter}`,
        email: input.email,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      subscribers = [created, ...subscribers];
      return created;
    },
    setStatus: async (subscriberId, status: SubscriberStatus) => {
      let updated: Subscriber | null = null;
      subscribers = subscribers.map((subscriber) => {
        if (subscriber.id !== subscriberId) return subscriber;
        updated = { ...subscriber, status };
        return updated;
      });
      return updated ?? { id: subscriberId, email: '', status, createdAt: '' };
    },
    remove: async (subscriberId) => {
      subscribers = subscribers.filter((subscriber) => subscriber.id !== subscriberId);
    },
    exportCsv: async () => ({
      filename: 'subscribers-demo.csv',
      content: subscribersToCsv(subscribers),
    }),
  };
};

/** In-memory App store so install/enable/remove can be tried without a backend. */
export const createDemoAppsApi = (): AppsApi => {
  const installed = new Map<string, InstalledApp>([
    [
      'google-analytics',
      {
        key: 'google-analytics',
        name: 'Google Analytics',
        description: 'ส่งสถิติผู้เข้าชมไปยัง Google Analytics เพื่อดูรายงานเชิงลึก',
        category: 'analytics',
        permissions: ['analytics:read'],
        enabled: true,
        config: {},
        installedAt: '2026-10-10T10:00:00.000Z',
      },
    ],
  ]);

  const fromCatalog = (key: string): InstalledApp => {
    const app = APP_CATALOG.find((entry) => entry.key === key);
    const localized = app ? localizeCatalogApp(app, uiLocaleNow()) : null;
    return {
      key,
      name: localized?.name ?? key,
      description: localized?.description ?? '',
      category: app?.category ?? 'content',
      permissions: app?.permissions ?? [],
      enabled: true,
      config: {},
      installedAt: new Date().toISOString(),
    };
  };

  const store = (): AppStoreEntry[] =>
    APP_CATALOG.map((app) => {
      const entry = installed.get(app.key);
      return {
        ...localizeCatalogApp(app, uiLocaleNow()),
        installed: Boolean(entry),
        enabled: entry?.enabled ?? false,
      };
    });

  return {
    store: async () => store(),
    installed: async () => [...installed.values()],
    install: async (appKey) => {
      const entry = fromCatalog(appKey);
      installed.set(appKey, entry);
      return entry;
    },
    setEnabled: async (appKey, enabled) => {
      const current = installed.get(appKey) ?? fromCatalog(appKey);
      const next = { ...current, enabled };
      installed.set(appKey, next);
      return next;
    },
    uninstall: async (appKey) => {
      installed.delete(appKey);
    },
    previewExternal: async (url) => ({
      manifestUrl: url,
      entry: `${url.replace(/\/[^/]*$/, '')}/index.html`,
      manifest: {
        key: 'demo-external',
        name: 'App ตัวอย่างจากภายนอก',
        description: 'App ที่โฮสต์ manifest เอง ใช้สาธิตการติดตั้งในโหมดทดลอง',
        version: '1.0.0',
        permissions: ['contents:read'],
        category: 'content',
        entry: 'index.html',
      },
    }),
    installExternal: async (url) => {
      const entry: InstalledApp = {
        key: 'demo-external',
        name: 'App ตัวอย่างจากภายนอก',
        description: 'App ที่โฮสต์ manifest เอง ใช้สาธิตการติดตั้งในโหมดทดลอง',
        category: 'content',
        permissions: ['contents:read'],
        enabled: true,
        config: {},
        installedAt: new Date().toISOString(),
        source: 'external',
        entry: `${url.replace(/\/[^/]*$/, '')}/index.html`,
        manifestUrl: url,
        version: '1.0.0',
      };
      installed.set(entry.key, entry);
      return entry;
    },
    callBridge: async (appKey, method) => {
      const entry = installed.get(appKey);
      if (!entry) throw new Error(translateNow('demo.appNotInstalled'));
      if (!entry.enabled) throw new Error(translateNow('demo.appDisabled'));

      const scope = requiredScopeFor(method);
      if (!scope || !entry.permissions.includes(scope)) {
        throw new Error(translateNow('demo.appDenied'));
      }

      if (method === 'analytics.summary') return { visitors: 248, pageviews: 512 };
      if (method === 'contents.list') {
        return {
          items: [
            { id: 'demo-page-1', title: 'หน้าแรก' },
            { id: 'demo-page-2', title: 'บริการ' },
          ],
        };
      }
      if (method === 'forms.list') {
        return { items: [{ id: 'demo-form-1', title: 'ติดต่อเรา' }] };
      }
      return { items: [{ id: 'demo-media-1', title: 'logo.png' }] };
    },
  };
};

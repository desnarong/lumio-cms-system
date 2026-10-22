import type { GrowthTab } from '../route.js';
import { AnalyticsPage } from './AnalyticsPage.js';
import { AppsPage } from './AppsPage.js';
import { NewsletterPage } from './NewsletterPage.js';
import { SeoPage } from './SeoPage.js';
import type { AnalyticsApi, AppsApi, NewsletterApi, SeoApi } from './api.js';

export interface GrowthApis {
  seo: SeoApi;
  analytics: AnalyticsApi;
  newsletter: NewsletterApi;
  apps: AppsApi;
}

export interface GrowthPageProps {
  tab: GrowthTab;
  apis: GrowthApis;
  /** Newsletter edits and App installs need a write role. */
  canManage: boolean;
  onNavigate: (path: string) => void;
}

/** Routes the four "เติบโต" screens (docs/design/05-admin-ia.md 5.1). */
export const GrowthPage = ({ tab, apis, canManage, onNavigate }: GrowthPageProps) => {
  switch (tab) {
    case 'seo':
      return <SeoPage api={apis.seo} onNavigate={onNavigate} canManage={canManage} />;
    case 'analytics':
      return <AnalyticsPage api={apis.analytics} />;
    case 'newsletter':
      return <NewsletterPage api={apis.newsletter} canManage={canManage} />;
    case 'apps':
      return <AppsPage api={apis.apps} canManage={canManage} />;
  }
};

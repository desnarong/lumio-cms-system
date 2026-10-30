import type { FeatureFlagKey, Role } from '@lumio/shared';
import { Tabs, useT, type MessageKey } from '@lumio/ui';
import { GROWTH_TABS, type GrowthTab } from '../route.js';
import { allowedTabs } from '../shell/nav.js';
import { MembershipPage } from '../membership/MembershipPage.js';
import { AnalyticsPage } from './AnalyticsPage.js';
import { AppsPage } from './AppsPage.js';
import { NewsletterPage } from './NewsletterPage.js';
import { SeoPage } from './SeoPage.js';
import type { MembershipApi } from '../membership/api.js';
import { MarketplacePage } from '../marketplace/MarketplacePage.js';
import type { MarketplaceApi } from '../marketplace/api.js';
import type { AnalyticsApi, AppsApi, NewsletterApi, SeoApi } from './api.js';

export interface GrowthApis {
  seo: SeoApi;
  analytics: AnalyticsApi;
  newsletter: NewsletterApi;
  apps: AppsApi;
  membership: MembershipApi;
  marketplace: MarketplaceApi;
}

export interface GrowthPageProps {
  tab: GrowthTab;
  apis: GrowthApis;
  /** Newsletter edits and App installs need a write role. */
  canManage: boolean;
  onNavigate: (path: string) => void;
  /** Who is signed in: the Apps tab is not offered to roles that cannot open it. */
  role: Role;
  /** Add-ons the site still offers; a closed one loses its tab. */
  features?: readonly FeatureFlagKey[];
}

const TAB_LABELS: Record<GrowthTab, MessageKey> = {
  seo: 'nav.seo',
  analytics: 'nav.analytics',
  newsletter: 'nav.newsletter',
  membership: 'nav.membership',
  apps: 'nav.apps',
  marketplace: 'nav.marketplace',
};

/**
 * Routes the four "เติบโต" screens (docs/design/05-admin-ia.md 5.1). The sidebar
 * has one door for all of them, so the tab strip built here is their only
 * sub-navigation; each screen keeps its own title and description.
 */
export const GrowthPage = ({
  tab,
  apis,
  canManage,
  onNavigate,
  role,
  features,
}: GrowthPageProps) => {
  const t = useT();
  const openTabs = allowedTabs('growth', GROWTH_TABS, role, features);
  const headerTabs =
    openTabs.length > 1 ? (
      <Tabs
        className="growth-tabs"
        items={openTabs.map((id) => ({ id, label: t(TAB_LABELS[id]) }))}
        value={tab}
        onChange={(id) => onNavigate(`/growth/${id}`)}
      />
    ) : undefined;

  switch (tab) {
    case 'seo':
      return (
        <SeoPage
          api={apis.seo}
          onNavigate={onNavigate}
          canManage={canManage}
          headerTabs={headerTabs}
        />
      );
    case 'analytics':
      return <AnalyticsPage api={apis.analytics} headerTabs={headerTabs} />;
    case 'newsletter':
      return <NewsletterPage api={apis.newsletter} canManage={canManage} headerTabs={headerTabs} />;
    case 'membership':
      return (
        <MembershipPage
          api={apis.membership}
          canManage={canManage}
          headerTabs={headerTabs}
        />
      );
    case 'apps':
      return <AppsPage api={apis.apps} canManage={canManage} headerTabs={headerTabs} />;
    case 'marketplace':
      return (
        <MarketplacePage
          api={apis.marketplace}
          canManage={canManage}
          headerTabs={headerTabs}
        />
      );
  }
};

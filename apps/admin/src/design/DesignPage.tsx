import type { DesignTab } from '../route.js';
import { PageHeader, Tabs, useT, type MessageKey } from '@lumio/ui';
import type { DesignApi } from './api.js';
import { HeaderFooterPanel } from './HeaderFooterPanel.js';
import { useDesignTokens } from './hooks.js';
import { MenusPanel } from './MenusPanel.js';
import { SectionsPanel } from './SectionsPanel.js';
import { StylePanel } from './StylePanel.js';
import { TemplatePanel } from './TemplatePanel.js';

export interface DesignPageProps {
  api: DesignApi;
  tab: DesignTab;
  onNavigate: (path: string) => void;
  /** Languages the site offers; menus can differ per language. */
  locales?: string[];
}

const TABS: { id: DesignTab; labelKey: MessageKey }[] = [
  { id: 'style', labelKey: 'nav.style' },
  { id: 'menus', labelKey: 'nav.menus' },
  { id: 'header-footer', labelKey: 'nav.headerFooter' },
  { id: 'template', labelKey: 'nav.template' },
  { id: 'sections', labelKey: 'nav.sections' },
];

/**
 * Design screens (docs/design/05-admin-ia.md 5.1): style, navigation,
 * header/footer, template switching and the saved sections library. The sidebar
 * has one door for all of them, so the tabs here are the only sub-navigation.
 * Every tab has its own URL, so links from the dashboard land directly on it.
 */
export const DesignPage = ({ api, tab, onNavigate, locales = [] }: DesignPageProps) => {
  const t = useT();
  const design = useDesignTokens(api);

  return (
    <div className="design-page">
      <PageHeader
        eyebrow={t('nav.section.site')}
        title={t('design.title')}
        description={t('design.subtitle')}
        tabs={
          <Tabs
            items={TABS.map((item) => ({ id: item.id, label: t(item.labelKey) }))}
            value={tab}
            onChange={(id) => onNavigate(`/design/${id}`)}
          />
        }
      />

      {tab === 'style' ? <StylePanel design={design} /> : null}
      {tab === 'menus' ? <MenusPanel api={api} locales={locales} /> : null}
      {tab === 'header-footer' ? <HeaderFooterPanel api={api} /> : null}
      {tab === 'template' ? (
        <TemplatePanel
          api={api}
          currentTemplateId={design.tokens?.templateId ?? null}
          onApplied={() => void design.reload()}
        />
      ) : null}
      {tab === 'sections' ? <SectionsPanel api={api} /> : null}
    </div>
  );
};

import type { DesignTab } from '../route.js';
import { Tabs, useT, type MessageKey } from '@lumio/ui';
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
 * Design menu (docs/design/05-admin-ia.md 5.1): style, navigation, header/footer,
 * template switching and the saved sections library. Every tab has its own URL, so
 * links from the dashboard land directly on the right tab.
 */
export const DesignPage = ({ api, tab, onNavigate, locales = [] }: DesignPageProps) => {
  const t = useT();
  const design = useDesignTokens(api);

  return (
    <div className="design-page">
      <header className="design-page__header">
        <h1 className="design-page__title">{t('design.title')}</h1>
        <p className="design-page__subtitle">{t('design.subtitle')}</p>
      </header>

      <Tabs
        items={TABS.map((item) => ({ id: item.id, label: t(item.labelKey) }))}
        value={tab}
        onChange={(id) => onNavigate(`/design/${id}`)}
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

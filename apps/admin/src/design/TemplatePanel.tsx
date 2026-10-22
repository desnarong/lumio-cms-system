import { useState } from 'react';
import type { BusinessType, TemplateSummary } from '@lumio/shared';
import { Banner, Button, Card, EmptyState, Skeleton, Switch, useT, type MessageKey } from '@lumio/ui';
import { cn } from '@lumio/ui/cn';
import type { DesignApi } from './api.js';
import { useTemplates } from './hooks.js';

const BUSINESS_LABEL_KEYS: Record<BusinessType, MessageKey> = {
  restaurant: 'biz.restaurant',
  clinic: 'biz.clinic',
  freelance: 'biz.freelance',
  shop: 'biz.shop',
  blog: 'biz.blog',
  other: 'biz.other',
};

export interface TemplatePanelProps {
  api: DesignApi;
  /** The template the site currently uses, so the active card is marked. */
  currentTemplateId: string | null;
  onApplied: () => void;
}

const TemplateCard = ({
  template,
  active,
  applying,
  onApply,
}: {
  template: TemplateSummary;
  active: boolean;
  applying: boolean;
  onApply: () => void;
}) => {
  const t = useT();

  return (
    <Card className={cn('template-card', active && 'template-card--active')}>
      <img className="template-card__preview" src={template.previewUrl} alt="" loading="lazy" />
      <div className="template-card__body">
        <h3 className="template-card__name">{template.name}</h3>
        <p className="template-card__meta">{t(BUSINESS_LABEL_KEYS[template.businessType])}</p>
        <p className="template-card__description">{template.description}</p>
      </div>
      <Button variant={active ? 'ghost' : 'secondary'} disabled={applying} onClick={onApply}>
        {active ? t('template.active') : applying ? t('template.applying') : t('template.use')}
      </Button>
    </Card>
  );
};

/**
 * Template tab: switch the whole look of the site. Content is never touched, so
 * the only real choice is whether header/footer come along
 * (docs/design/08-theme-design-panel.md 8.2).
 */
export const TemplatePanel = ({ api, currentTemplateId, onApplied }: TemplatePanelProps) => {
  const t = useT();
  const templates = useTemplates(api);
  const [applyHeaderFooter, setApplyHeaderFooter] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  if (templates.loading) {
    return (
      <div className="design-panel" aria-busy="true">
        <Skeleton shape="block" height={280} />
        <Skeleton shape="block" height={280} />
      </div>
    );
  }

  if (templates.templates.length === 0) {
    return (
      <EmptyState
        tone={templates.error ? 'error' : 'neutral'}
        title={t('template.empty')}
        description={templates.error ?? t('template.emptyHint')}
        action={
          <Button variant="secondary" onClick={() => void templates.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const apply = async (template: TemplateSummary): Promise<void> => {
    const ok = await templates.apply(template.id, applyHeaderFooter);
    if (ok) {
      setApplied(template.name);
      onApplied();
    }
  };

  return (
    <div className="design-panel">
      <Banner tone="info" title={t('template.safeTitle')}>
        {t('template.safeBody')}
      </Banner>

      {applied ? (
        <Banner tone="success" title={t('template.appliedTitle', { name: applied })}>
          {t('template.appliedBody')}
        </Banner>
      ) : null}

      {templates.error ? (
        <p className="design-error" role="alert">
          {templates.error}
        </p>
      ) : null}

      <div className="design-toolbar">
        <Switch
          checked={applyHeaderFooter}
          label={t('template.withHeaderFooter')}
          description={t('template.withHeaderFooterHint')}
          onChange={setApplyHeaderFooter}
        />
      </div>

      <div className="template-grid">
        {templates.templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            active={template.id === currentTemplateId}
            applying={templates.applying === template.id}
            onApply={() => void apply(template)}
          />
        ))}
      </div>
    </div>
  );
};

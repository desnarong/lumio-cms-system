import type { ElementType, ReactNode } from 'react';
import { cn } from './cn.js';

export interface PageHeaderProps {
  /** Screen name; rendered as the page's only `h1` (or `h2` inside a dialog). */
  title: ReactNode;
  /** One short sentence that says what the screen is for. */
  description?: ReactNode;
  /** Section label above the title, so a deep screen still says where it lives. */
  eyebrow?: ReactNode;
  /**
   * Buttons of this screen. Keep a single primary button here and demote the
   * rest (docs/design/04-ux.md 4.2).
   */
  actions?: ReactNode;
  /** Counters or status chips that belong to the title, not to a card. */
  meta?: ReactNode;
  /** Sub-navigation (tabs, filters) rendered full width under the title row. */
  tabs?: ReactNode;
  /** Heading element; `h2` when the header sits inside another landmark. */
  as?: ElementType;
  className?: string;
}

/**
 * The one header every back-office screen uses: title, plain-language
 * description, its actions on the right, and optional tabs below. Reusing it
 * keeps all screens aligned and stops each page from inventing its own layout.
 */
export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  meta,
  tabs,
  as: Heading = 'h1',
  className,
}: PageHeaderProps) => (
  <header className={cn('ui-page-header', className)}>
    <div className="ui-page-header__row">
      <div className="ui-page-header__text">
        {eyebrow ? <p className="ui-page-header__eyebrow">{eyebrow}</p> : null}
        <Heading className="ui-page-header__title">{title}</Heading>
        {description ? <p className="ui-page-header__description">{description}</p> : null}
        {meta ? <div className="ui-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </div>
    {tabs ? <div className="ui-page-header__tabs">{tabs}</div> : null}
  </header>
);

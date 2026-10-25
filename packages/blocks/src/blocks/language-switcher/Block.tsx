import { Editable } from '../../engine/editable.js';
import type { BlockRenderProps, LanguageLink } from '../../types.js';
import type { LanguageSwitcherProps } from './schema.js';

/**
 * `hreflang` is written lowercase on purpose: React's `hrefLang` prop is emitted
 * camel-cased here, which browsers ignore, so the attribute is spread verbatim to
 * keep the `hreflang` signal intact.
 */
const linkAttrs = (link: LanguageLink): Record<string, string> => ({
  href: link.href,
  lang: link.locale,
  hreflang: link.locale,
  ...(link.active ? { 'aria-current': 'true' } : {}),
});

/**
 * Language switcher (docs/design/17-i18n.md 17.3). It renders plain links to the
 * same page in every language that exists, so the public page needs no JavaScript;
 * the language list is threaded down from the page payload.
 */
export const LanguageSwitcherBlock = ({
  props,
  block,
  languages,
}: BlockRenderProps<LanguageSwitcherProps>) => {
  const offered = languages ?? [];
  const links = props.showUnavailable ? offered : offered.filter((link) => link.available);

  if (links.length === 0 || offered.length < 2) {
    // A single-language site has nothing to switch to, and an empty switcher is
    // noise for visitors. The editor passes no language list at all, so the hint
    // below keeps the block visible there and selectable in the canvas.
    return languages === undefined ? (
      <p className="lumio-language__note" role="note">
        ยังมีภาษาที่เผยแพร่แล้วเพียงภาษาเดียว
      </p>
    ) : null;
  }

  return (
    <nav
      className="lumio-language"
      data-display={props.display}
      aria-label={props.label.length > 0 ? props.label : 'เลือกภาษา'}
    >
      {props.label.length > 0 ? (
        <Editable
          as="span"
          path="props.label"
          value={props.label}
          runs={block.textStyles?.['props.label']}
          layout={block.textLayouts?.['props.label']}
          className="lumio-language__label"
          label="ป้ายกำกับภาษา"
        />
      ) : null}
      <ul className="lumio-language__list">
        {links.map((link) =>
          link.available ? (
            <li className="lumio-language__item" key={link.locale}>
              <a className="lumio-language__link" {...linkAttrs(link)}>
                {link.label}
              </a>
            </li>
          ) : (
            <li className="lumio-language__item" key={link.locale}>
              <span
                className="lumio-language__link lumio-language__link--disabled"
                lang={link.locale}
                aria-disabled="true"
              >
                {link.label}
              </span>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
};
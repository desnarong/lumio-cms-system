import type { BlockNode, PublicForm } from '@lumio/shared';
import { registry, type BlockRegistry } from '../registry.js';
import type {
  AnyBlockDefinition,
  LanguageLink,
  LatestPostCard,
  PromotionCard,
  ShopProductCard,
} from '../types.js';
import { bt } from '../i18n.js';
import { BlockShell } from './shell.js';

export interface BlockRendererProps {
  block: BlockNode;
  /** Overrides the global registry, e.g. for previews or tests. */
  blockRegistry?: BlockRegistry;
  /** Contact-form definitions the page renders; passed to blocks that need them. */
  forms?: readonly PublicForm[];
  /** Languages the page can be read in; passed to the language-switcher block. */
  languages?: readonly LanguageLink[];
  /** Products the shop publishes now; passed to a products block reading the catalog. */
  shopProducts?: readonly ShopProductCard[];
  /** Published posts; passed to a posts block reading the blog. */
  latestPosts?: readonly LatestPostCard[];
  /** Live offers; passed to a feature grid that follows the promotion list. */
  promotions?: readonly PromotionCard[];
  /** Language the page is read in, for the text blocks write themselves (th when absent). */
  locale?: string;
}

export interface BlockTreeRendererProps extends Omit<BlockRendererProps, 'block'> {
  blocks: BlockNode[];
}

/** Shown when a page references a block type this build does not ship. */
export const UnknownBlock = ({ block, locale }: { block: BlockNode; locale?: string }) => (
  <div className="lumio-block__unknown" role="note">
    {bt('ยังไม่รองรับบล็อกประเภท “{type}”', locale, { type: block.type })}
  </div>
);

interface SharedBlockData {
  forms?: readonly PublicForm[];
  languages?: readonly LanguageLink[];
  shopProducts?: readonly ShopProductCard[];
  latestPosts?: readonly LatestPostCard[];
  promotions?: readonly PromotionCard[];
  locale?: string;
}

const renderBlock = (definition: AnyBlockDefinition, block: BlockNode, shared: SharedBlockData) => {
  const parsed = definition.schema.safeParse({
    version: block.version,
    props: block.props,
    style: block.style,
  });
  const data = parsed.success
    ? parsed.data
    : {
        version: definition.version,
        props: definition.defaults.props,
        style: definition.defaults.style,
      };
  const Component = definition.Block;
  return (
    <Component
      props={data.props}
      style={data.style}
      block={block}
      {...(shared.forms ? { forms: shared.forms } : {})}
      {...(shared.languages ? { languages: shared.languages } : {})}
      {...(shared.shopProducts ? { shopProducts: shared.shopProducts } : {})}
      {...(shared.latestPosts ? { latestPosts: shared.latestPosts } : {})}
      {...(shared.promotions ? { promotions: shared.promotions } : {})}
      {...(shared.locale ? { locale: shared.locale } : {})}
    />
  );
};

/**
 * Renders a single block node: looks up the definition, validates its props against the
 * block schema (falling back to the block defaults) and wraps it in the shared shell.
 * Stays hook-free so the public renderer can output it as static HTML.
 */
export const BlockRenderer = ({
  block,
  blockRegistry = registry,
  forms,
  languages,
  shopProducts,
  latestPosts,
  promotions,
  locale,
}: BlockRendererProps) => {
  const definition = blockRegistry.get(block.type);
  const shared: SharedBlockData = {
    ...(forms ? { forms } : {}),
    ...(languages ? { languages } : {}),
    ...(shopProducts ? { shopProducts } : {}),
    ...(latestPosts ? { latestPosts } : {}),
    ...(promotions ? { promotions } : {}),
    ...(locale ? { locale } : {}),
  };
  return (
    <BlockShell block={block}>
      {definition ? (
        renderBlock(definition, block, shared)
      ) : (
        <UnknownBlock block={block} {...(locale ? { locale } : {})} />
      )}
      {block.children.length > 0 ? (
        <div className="lumio-block__children">
          <BlockTreeRenderer blocks={block.children} blockRegistry={blockRegistry} {...shared} />
        </div>
      ) : null}
    </BlockShell>
  );
};

/** Renders a page's block tree in order. */
export const BlockTreeRenderer = ({ blocks, ...rest }: BlockTreeRendererProps) => (
  <>
    {blocks.map((block) => (
      <BlockRenderer key={block.id} block={block} {...rest} />
    ))}
  </>
);

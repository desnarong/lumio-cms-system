import type { BlockNode, PublicForm } from '@lumio/shared';
import { registry, type BlockRegistry } from '../registry.js';
import type { AnyBlockDefinition, LanguageLink, ShopProductCard } from '../types.js';
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
}

export interface BlockTreeRendererProps extends Omit<BlockRendererProps, 'block'> {
  blocks: BlockNode[];
}

/** Shown when a page references a block type this build does not ship. */
export const UnknownBlock = ({ block }: { block: BlockNode }) => (
  <div className="lumio-block__unknown" role="note">
    ยังไม่รองรับบล็อกประเภท “{block.type}”
  </div>
);

interface SharedBlockData {
  forms?: readonly PublicForm[];
  languages?: readonly LanguageLink[];
  shopProducts?: readonly ShopProductCard[];
}

const renderBlock = (
  definition: AnyBlockDefinition,
  block: BlockNode,
  shared: SharedBlockData,
) => {
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
}: BlockRendererProps) => {
  const definition = blockRegistry.get(block.type);
  const shared: SharedBlockData = {
    ...(forms ? { forms } : {}),
    ...(languages ? { languages } : {}),
    ...(shopProducts ? { shopProducts } : {}),
  };
  return (
    <BlockShell block={block}>
      {definition ? (
        renderBlock(definition, block, shared)
      ) : (
        <UnknownBlock block={block} />
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

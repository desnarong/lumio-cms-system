import type {
  AnyBlockDefinition,
  BlockCategory,
  BlockDefinition,
  BlockLoader,
  BlockLoaderContext,
} from './types.js';

export class BlockRegistry {
  private readonly blocks = new Map<string, AnyBlockDefinition>();
  private readonly loaders = new Map<string, BlockLoader>();

  register<P>(definition: BlockDefinition<P>): void {
    if (this.blocks.has(definition.type)) {
      throw new Error(`Block "${definition.type}" is already registered`);
    }
    this.blocks.set(definition.type, definition as unknown as AnyBlockDefinition);
  }

  get(type: string): AnyBlockDefinition | undefined {
    return this.blocks.get(type);
  }

  has(type: string): boolean {
    return this.blocks.has(type);
  }

  list(): AnyBlockDefinition[] {
    return [...this.blocks.values()];
  }

  listByCategory(category: BlockCategory): AnyBlockDefinition[] {
    return this.list().filter((block) => block.category === category);
  }

  /**
   * Dynamic blocks (latest posts, search, ...) declare a loader instead of calling
   * the API themselves, so the same block works in SSR, ISR and the editor preview.
   */
  registerLoader(type: string, loader: BlockLoader): void {
    if (this.loaders.has(type)) {
      throw new Error(`Loader for block "${type}" is already registered`);
    }
    this.loaders.set(type, loader);
  }

  getLoader(type: string): BlockLoader | undefined {
    return this.loaders.get(type);
  }

  hasLoader(type: string): boolean {
    return this.loaders.has(type);
  }

  listLoaders(): string[] {
    return [...this.loaders.keys()];
  }
}

export const registry = new BlockRegistry();

/** Runs the loader a block declared, failing loudly when it forgot to declare one. */
export const loadBlockData = async <R = unknown>(
  type: string,
  ctx: BlockLoaderContext,
  params: Record<string, unknown> = {},
): Promise<R> => {
  const loader = registry.getLoader(type);
  if (!loader) {
    throw new Error(`Block "${type}" has no data loader registered`);
  }
  return (await loader(ctx, params)) as R;
};

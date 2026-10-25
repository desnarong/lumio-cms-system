import type { BlockDefinition } from '../../types.js';
import { ProductsBlock } from './Block.js';
import { ProductsPanel } from './Panel.js';
import { productsDefaults } from './defaults.js';
import { productsSchema, type ProductsProps } from './schema.js';

export * from './shop.js';

export const productsBlock: BlockDefinition<ProductsProps> = {
  type: 'products',
  label: 'สินค้า (การ์ดสินค้า)',
  labelEn: 'Products',
  category: 'landing',
  version: 1,
  icon: 'Package',
  schema: productsSchema,
  defaults: productsDefaults,
  Block: ProductsBlock,
  Panel: ProductsPanel,
};

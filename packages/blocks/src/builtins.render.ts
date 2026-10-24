import { ButtonBlock } from './blocks/button/Block.js';
import { buttonDefaults } from './blocks/button/defaults.js';
import { buttonSchema } from './blocks/button/schema.js';
import { FeaturesBlock } from './blocks/features/Block.js';
import { featuresDefaults } from './blocks/features/defaults.js';
import { featuresSchema } from './blocks/features/schema.js';
import { FormBlock } from './blocks/form/Block.js';
import { formDefaults } from './blocks/form/defaults.js';
import { formSchema } from './blocks/form/schema.js';
import { HeadingBlock } from './blocks/heading/Block.js';
import { headingDefaults } from './blocks/heading/defaults.js';
import { headingSchema } from './blocks/heading/schema.js';
import { HeroBlock } from './blocks/hero/Block.js';
import { heroDefaults } from './blocks/hero/defaults.js';
import { heroSchema } from './blocks/hero/schema.js';
import { ImageBlock } from './blocks/image/Block.js';
import { imageDefaults } from './blocks/image/defaults.js';
import { imageSchema } from './blocks/image/schema.js';
import { LanguageSwitcherBlock } from './blocks/language-switcher/Block.js';
import { languageSwitcherDefaults } from './blocks/language-switcher/defaults.js';
import { languageSwitcherSchema } from './blocks/language-switcher/schema.js';
import { ParagraphBlock } from './blocks/paragraph/Block.js';
import { paragraphDefaults } from './blocks/paragraph/defaults.js';
import { paragraphSchema } from './blocks/paragraph/schema.js';
import { PostsBlock } from './blocks/posts/Block.js';
import { postsDefaults } from './blocks/posts/defaults.js';
import { postsSchema } from './blocks/posts/schema.js';
import { ProductsBlock } from './blocks/products/Block.js';
import { productsDefaults } from './blocks/products/defaults.js';
import { productsSchema } from './blocks/products/schema.js';
import { registry } from './registry.js';
import type { AnyBlockDefinition } from './types.js';

/**
 * The same built-in blocks as `builtins.ts`, minus their editor panels. The
 * public renderer imports this list (through `@lumio/blocks/render`) so the
 * page bundle never pulls the UI kit or the panel code
 * (docs/design/14-seo-performance.md 14.2).
 */
export const renderBuiltinBlocks = [
  {
    type: 'heading',
    label: 'หัวข้อ',
    category: 'text',
    version: 1,
    icon: 'Heading',
    schema: headingSchema,
    defaults: headingDefaults,
    Block: HeadingBlock,
  },
  {
    type: 'paragraph',
    label: 'ย่อหน้า',
    category: 'text',
    version: 1,
    icon: 'AlignLeft',
    schema: paragraphSchema,
    defaults: paragraphDefaults,
    Block: ParagraphBlock,
  },
  {
    type: 'image',
    label: 'รูปภาพ',
    category: 'media',
    version: 1,
    icon: 'Image',
    schema: imageSchema,
    defaults: imageDefaults,
    Block: ImageBlock,
  },
  {
    type: 'button',
    label: 'ปุ่ม',
    category: 'interactive',
    version: 1,
    icon: 'MousePointerClick',
    schema: buttonSchema,
    defaults: buttonDefaults,
    Block: ButtonBlock,
  },
  {
    type: 'hero',
    label: 'ส่วนต้อนรับ (Hero)',
    category: 'landing',
    version: 1,
    icon: 'Layout',
    schema: heroSchema,
    defaults: heroDefaults,
    Block: HeroBlock,
  },
  {
    type: 'features',
    label: 'จุดเด่น (Features)',
    category: 'landing',
    version: 1,
    icon: 'Sparkles',
    schema: featuresSchema,
    defaults: featuresDefaults,
    Block: FeaturesBlock,
  },
  {
    type: 'products',
    label: 'สินค้า (การ์ดสินค้า)',
    category: 'landing',
    version: 1,
    icon: 'Package',
    schema: productsSchema,
    defaults: productsDefaults,
    Block: ProductsBlock,
  },
  {
    type: 'posts',
    label: 'บทความ (การ์ดบทความ)',
    category: 'dynamic',
    version: 1,
    icon: 'Book',
    schema: postsSchema,
    defaults: postsDefaults,
    Block: PostsBlock,
  },
  {
    type: 'form',
    label: 'ฟอร์มติดต่อ',
    category: 'interactive',
    version: 1,
    icon: 'Mail',
    schema: formSchema,
    defaults: formDefaults,
    Block: FormBlock,
  },
  {
    type: 'language-switcher',
    label: 'ตัวสลับภาษา',
    category: 'interactive',
    version: 1,
    icon: 'Languages',
    schema: languageSwitcherSchema,
    defaults: languageSwitcherDefaults,
    Block: LanguageSwitcherBlock,
  },
] as unknown as AnyBlockDefinition[];

/** Registers every built-in block for server rendering (idempotent). */
export const registerRenderBlocks = (): void => {
  for (const block of renderBuiltinBlocks) {
    if (!registry.has(block.type)) {
      registry.register(block);
    }
  }
};

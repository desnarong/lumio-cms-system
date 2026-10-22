import { buttonBlock } from './blocks/button/index.js';
import { featuresBlock } from './blocks/features/index.js';
import { formBlock } from './blocks/form/index.js';
import { headingBlock } from './blocks/heading/index.js';
import { heroBlock } from './blocks/hero/index.js';
import { imageBlock } from './blocks/image/index.js';
import { languageSwitcherBlock } from './blocks/language-switcher/index.js';
import { paragraphBlock } from './blocks/paragraph/index.js';
import { registry } from './registry.js';
import type { AnyBlockDefinition } from './types.js';

/** Blocks shipped with Lumio. Custom blocks from Apps are appended at runtime. */
export const builtinBlocks: AnyBlockDefinition[] = [
  headingBlock as unknown as AnyBlockDefinition,
  paragraphBlock as unknown as AnyBlockDefinition,
  imageBlock as unknown as AnyBlockDefinition,
  buttonBlock as unknown as AnyBlockDefinition,
  heroBlock as unknown as AnyBlockDefinition,
  featuresBlock as unknown as AnyBlockDefinition,
  formBlock as unknown as AnyBlockDefinition,
  languageSwitcherBlock as unknown as AnyBlockDefinition,
];

export const registerBuiltinBlocks = (): void => {
  for (const block of builtinBlocks) {
    if (!registry.has(block.type)) {
      registry.register(block);
    }
  }
};

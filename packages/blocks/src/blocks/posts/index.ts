import type { BlockDefinition } from '../../types.js';
import { PostsBlock } from './Block.js';
import { PostsPanel } from './Panel.js';
import { postsDefaults } from './defaults.js';
import { postsSchema, type PostsProps } from './schema.js';

export const postsBlock: BlockDefinition<PostsProps> = {
  type: 'posts',
  label: 'บทความ (การ์ดบทความ)',
  labelEn: 'Articles',
  category: 'dynamic',
  version: 1,
  icon: 'Book',
  schema: postsSchema,
  defaults: postsDefaults,
  Block: PostsBlock,
  Panel: PostsPanel,
};

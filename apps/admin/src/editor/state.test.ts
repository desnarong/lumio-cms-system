import { describe, expect, it } from 'vitest';
import { createBlockNode, registerBuiltinBlocks } from '@lumio/blocks';
import type { BlockTree, ContentDetail } from '@lumio/shared';
import { editorReducer, initialEditorState, type EditorAction } from './state.js';

registerBuiltinBlocks();

const blocks = (): BlockTree => [
  createBlockNode('heading'),
  createBlockNode('paragraph'),
  createBlockNode('button'),
];

const content = (): ContentDetail => ({
  id: 'c1',
  type: 'page',
  title: 'หน้าแรก',
  slug: 'home',
  status: 'draft',
  locale: 'th',
  translationGroupId: 'c1',
  excerpt: null,
  revision: 4,
  updatedAt: '2026-10-20T00:00:00.000Z',
  publishedAt: null,
  archivedAt: null,
  blocks: blocks(),
  publishedBlocks: null,
  seo: { noindex: false },
  createdAt: '2026-10-01T00:00:00.000Z',
});

const start = () => initialEditorState(content());

const run = (actions: EditorAction[]) => actions.reduce(editorReducer, start());

describe('editor cover', () => {
  it('stores the chosen cover without touching the block tree', () => {
    const before = initialEditorState(content());
    const after = editorReducer(before, {
      type: 'cover',
      coverMediaId: 'm1',
      coverImageUrl: 'https://cdn.example.com/cover.jpg',
    });

    expect(after.content.coverMediaId).toBe('m1');
    expect(after.content.coverImageUrl).toBe('https://cdn.example.com/cover.jpg');
    expect(after.history.present).toBe(before.history.present);
  });
});

describe('editorReducer', () => {
  it('starts on desktop in edit mode with nothing selected', () => {
    const state = start();
    expect(state.device).toBe('desktop');
    expect(state.mode).toBe('edit');
    expect(state.panelMode).toBe('simple');
    expect(state.selectedId).toBeNull();
    expect(state.history.present).toHaveLength(3);
  });

  it('inserts a block at the requested index and selects it', () => {
    const node = createBlockNode('image');
    const state = run([{ type: 'insert', index: 1, block: node }]);

    expect(state.history.present.map((block) => block.type)).toEqual([
      'heading',
      'image',
      'paragraph',
      'button',
    ]);
    expect(state.selectedId).toBe(node.id);
  });

  it('deletes a block and brings it back in place on undo', () => {
    const before = start();
    const target = before.history.present[1];
    const removed = editorReducer(before, { type: 'remove', id: target?.id ?? '' });

    expect(removed.history.present).toHaveLength(2);

    const restored = editorReducer(removed, { type: 'undo' });
    expect(restored.history.present.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'button',
    ]);
  });

  it('duplicates a block right after the original', () => {
    const state = start();
    const target = state.history.present[0];
    const next = editorReducer(state, { type: 'duplicate', id: target?.id ?? '' });

    expect(next.history.present).toHaveLength(4);
    expect(next.history.present[0]?.id).toBe(target?.id);
    expect(next.history.present[1]?.id).not.toBe(target?.id);
  });

  it('reorders blocks', () => {
    const state = run([{ type: 'move', from: [0], to: [2] }]);
    expect(state.history.present.map((block) => block.type)).toEqual([
      'paragraph',
      'heading',
      'button',
    ]);
  });

  it('clears the selection when the selected block is deleted', () => {
    const state = start();
    const target = state.history.present[0];
    const selected = editorReducer(state, { type: 'select', id: target?.id ?? '' });
    const removed = editorReducer(selected, { type: 'remove', id: target?.id ?? '' });

    expect(removed.selectedId).toBeNull();
  });

  it('writes a panel change through a dot path', () => {
    const state = start();
    const target = state.history.present[0];
    const next = editorReducer(state, {
      type: 'set-block-path',
      id: target?.id ?? '',
      path: 'props.text',
      value: 'หัวข้อใหม่',
    });

    expect(next.history.present[0]?.props.text).toBe('หัวข้อใหม่');
  });

  it('moves one text without moving the rest of the block', () => {
    const state = start();
    const target = state.history.present[0];
    const next = editorReducer(state, {
      type: 'text-layout',
      id: target?.id ?? '',
      path: 'props.text',
      layout: { x: 24, y: -8, scale: 120 },
    });

    expect(next.history.present[0]?.textLayouts?.['props.text']).toEqual({
      x: 24,
      y: -8,
      scale: 120,
    });
    expect(next.history.present[0]?.style.offsetX).toBeUndefined();
  });

  it('applies every accepted AI change of a block in a single undo step', () => {
    const state = start();
    const target = state.history.present[0];

    const next = editorReducer(state, {
      type: 'apply-paths',
      id: target?.id ?? '',
      changes: [
        { path: 'props.text', value: 'กาแฟคั่วสดจากดอย' },
        { path: 'props.level', value: 'h1' },
      ],
    });

    expect(next.history.present[0]?.props.text).toBe('กาแฟคั่วสดจากดอย');
    expect(next.history.present[0]?.props.level).toBe('h1');
    expect(next.history.past).toHaveLength(1);

    const undone = editorReducer(next, { type: 'undo' });
    expect(undone.history.present[0]?.props.text).toBe(target?.props.text);
    expect(undone.history.present[0]?.props.level).toBe(target?.props.level);
  });

  it('keeps the accepted SEO suggestion without touching the block tree', () => {
    const state = start();
    const next = editorReducer(state, {
      type: 'seo',
      seo: { title: 'กาแฟดอยคั่วสด', description: 'คั่วใหม่ทุกสัปดาห์', noindex: false },
    });

    expect(next.content.seo.title).toBe('กาแฟดอยคั่วสด');
    expect(next.history.present).toBe(state.history.present);
    expect(next.history.past).toHaveLength(state.history.past.length);
  });

  it('hides a block on the current device only', () => {
    const state = start();
    const target = state.history.present[0];
    const next = editorReducer(state, {
      type: 'toggle-visibility',
      id: target?.id ?? '',
      device: 'mobile',
    });

    expect(next.history.present[0]?.style.visibility).toEqual({
      mobile: false,
      tablet: true,
      desktop: true,
    });
  });

  it('tracks the revision and draft blocks after a successful save', () => {
    const base = start();
    const removed = editorReducer(base, {
      type: 'remove',
      id: base.history.present[2]?.id ?? '',
    });
    const state = editorReducer(removed, {
      type: 'saved',
      revision: 5,
      savedAt: '2026-10-20T08:15:03.000Z',
    });

    expect(state.saveState).toBe('saved');
    expect(state.content.revision).toBe(5);
    expect(state.content.blocks).toHaveLength(2);
    expect(state.content.updatedAt).toBe('2026-10-20T08:15:03.000Z');
  });

  it('raises and clears the conflict banner', () => {
    const conflicted = run([{ type: 'conflict', conflict: true }]);
    expect(conflicted.conflict).toBe(true);
    expect(conflicted.saveState).toBe('error');

    const cleared = editorReducer(conflicted, { type: 'conflict', conflict: false });
    expect(cleared.conflict).toBe(false);
  });

  it('marks the page published and keeps the draft as the published copy', () => {
    const state = run([{ type: 'published', publishedAt: '2026-10-20T09:00:00.000Z' }]);

    expect(state.content.status).toBe('published');
    expect(state.content.publishedAt).toBe('2026-10-20T09:00:00.000Z');
    expect(state.content.publishedBlocks).toBe(state.history.present);
  });

  it('does nothing when undo or redo has no history', () => {
    const state = start();
    expect(editorReducer(state, { type: 'undo' })).toBe(state);
    expect(editorReducer(state, { type: 'redo' })).toBe(state);
  });

  it('resets the tree but keeps the user view preferences', () => {
    const state = run([
      { type: 'device', device: 'mobile' },
      { type: 'panel-mode', panelMode: 'pro' },
    ]);
    const reloaded = editorReducer(state, {
      type: 'reset',
      content: { ...content(), revision: 9 },
    });

    expect(reloaded.device).toBe('mobile');
    expect(reloaded.panelMode).toBe('pro');
    expect(reloaded.content.revision).toBe(9);
    expect(reloaded.history.past).toHaveLength(0);
  });

  it('ignores a reorder across different parents', () => {
    const state = run([{ type: 'move', from: [0], to: [1, 0] }]);
    expect(state.history.present).toHaveLength(3);
  });
});

describe('saved sections', () => {
  it('inserts a saved section as a whole tree at the gap', () => {
    const saved = [createBlockNode('heading'), createBlockNode('paragraph')];
    const state = editorReducer(initialEditorState(content()), {
      type: 'insert-tree',
      index: 1,
      blocks: saved,
    });

    expect(state.history.present).toHaveLength(5);
    expect(state.history.present[1]?.type).toBe('heading');
    expect(state.selectedId).toBe(state.history.present[1]?.id);
  });

  it('gives every inserted block a fresh id so a section can be reused twice', () => {
    const saved = [createBlockNode('heading')];
    const once = editorReducer(initialEditorState(content()), {
      type: 'insert-tree',
      index: 0,
      blocks: saved,
    });
    const twice = editorReducer(once, { type: 'insert-tree', index: 0, blocks: saved });

    const ids = twice.history.present.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(twice.history.present[0]?.type).toBe('heading');
  });

  it('can be undone in one step', () => {
    const saved = [createBlockNode('heading'), createBlockNode('paragraph')];
    const inserted = editorReducer(initialEditorState(content()), {
      type: 'insert-tree',
      index: 0,
      blocks: saved,
    });
    const undone = editorReducer(inserted, { type: 'undo' });

    expect(undone.history.present).toHaveLength(3);
  });
});

describe('editorReducer translate-blocks', () => {
  it('swaps the whole tree in one step that undo reverts', () => {
    const before = initialEditorState(content());
    const translated: BlockTree = [createBlockNode('heading'), createBlockNode('paragraph')];
    const applied = editorReducer(before, { type: 'translate-blocks', blocks: translated });

    expect(applied.history.present).toBe(translated);
    expect(editorReducer(applied, { type: 'undo' }).history.present).toHaveLength(3);
  });

  it('drops a selection that is not in the translated tree', () => {
    const before = initialEditorState(content());
    const selected = editorReducer(before, {
      type: 'select',
      id: before.history.present[0]?.id ?? '',
    });
    const applied = editorReducer(selected, {
      type: 'translate-blocks',
      blocks: [createBlockNode('heading')],
    });

    expect(applied.selectedId).toBeNull();
  });
});

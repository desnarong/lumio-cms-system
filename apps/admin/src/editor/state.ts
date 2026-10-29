import {
  cloneTreeWithNewIds,
  createHistory,
  duplicateBlockById,
  findBlockById,
  insertBlockAt,
  insertBlocksAt,
  moveBlock,
  pushHistory,
  redo,
  removeBlockById,
  setBlockPath,
  setBlockTextLayout,
  setBlockTextStyles,
  setBlockVisibility,
  undo,
  updateBlockById,
  type BlockDevice,
  type BlockIndexPath,
  type EditorDevice,
  type History,
} from '@lumio/blocks';
import type {
  BlockEditorMode,
  BlockNode,
  BlockTree,
  ContentDetail,
  Seo,
  TextLayout,
  TextRun,
} from '@lumio/shared';
import type { EditorMode, SaveState } from './types.js';

export interface EditorState {
  content: ContentDetail;
  /** Block tree plus the undo/redo stacks. */
  history: History<BlockTree>;
  selectedId: string | null;
  device: EditorDevice;
  mode: EditorMode;
  /** Simple hides advanced block options; Pro reveals them (docs/design/04-ux.md 4.4). */
  panelMode: BlockEditorMode;
  saveState: SaveState;
  /** Set when the server rejected an autosave because someone else saved first. */
  conflict: boolean;
  lastSavedAt: string | null;
  draggingId: string | null;
  /** Gap the drop indicator is drawn in while dragging. */
  dropIndex: number | null;
}

export type EditorAction =
  | { type: 'select'; id: string | null }
  | { type: 'device'; device: EditorDevice }
  | { type: 'mode'; mode: EditorMode }
  | { type: 'panel-mode'; panelMode: BlockEditorMode }
  | { type: 'insert'; index: number; block: BlockNode }
  /** Inserts a saved section (a whole tree) at one gap. */
  | { type: 'insert-tree'; index: number; blocks: BlockTree }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'move'; from: BlockIndexPath; to: BlockIndexPath }
  | { type: 'set-block-path'; id: string; path: string; value: unknown }
  | { type: 'text-styles'; id: string; path: string; runs: TextRun[] }
  | { type: 'text-layout'; id: string; path: string; layout: TextLayout | undefined }
  /** Applies several paths of one block as a single step, so one undo reverts them all. */
  | { type: 'apply-paths'; id: string; changes: { path: string; value: unknown }[] }
  /** SEO fields changed outside the block tree (e.g. accepted an AI suggestion). */
  | { type: 'seo'; seo: Seo }
  /** Cover image changed outside the block tree (a post's blog-list picture). */
  | { type: 'cover'; coverMediaId: string | null; coverImageUrl: string | null }
  /** Swaps the whole tree for an assistant translation, as one undo step. */
  | { type: 'translate-blocks'; blocks: BlockTree }
  | { type: 'toggle-visibility'; id: string; device: BlockDevice }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saving' }
  | { type: 'saved'; revision: number; savedAt: string }
  | { type: 'published'; publishedAt: string }
  | { type: 'save-failed' }
  | { type: 'conflict'; conflict: boolean }
  | { type: 'drag'; id?: string | null; dropIndex?: number | null }
  | { type: 'reset'; content: ContentDetail };

export const initialEditorState = (content: ContentDetail): EditorState => ({
  content,
  history: createHistory(content.blocks),
  selectedId: null,
  device: 'desktop',
  mode: 'edit',
  panelMode: 'simple',
  saveState: 'idle',
  conflict: false,
  lastSavedAt: null,
  draggingId: null,
  dropIndex: null,
});

/** Drops the selection when the block it pointed at is gone (after undo, delete, ...). */
const withBlocks = (
  state: EditorState,
  blocks: BlockTree,
  extra: Partial<EditorState> = {},
): EditorState => {
  const selectedId =
    state.selectedId && findBlockById(blocks, state.selectedId) ? state.selectedId : null;
  return { ...state, selectedId, ...extra, history: pushHistory(state.history, blocks) };
};

const pruneSelection = (state: EditorState, blocks: BlockTree): string | null =>
  state.selectedId && findBlockById(blocks, state.selectedId) ? state.selectedId : null;

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'select':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id };

    case 'device':
      return { ...state, device: action.device };

    case 'mode':
      return { ...state, mode: action.mode };

    case 'panel-mode':
      return { ...state, panelMode: action.panelMode };

    case 'insert':
      return withBlocks(state, insertBlockAt(state.history.present, [action.index], action.block), {
        selectedId: action.block.id,
      });

    case 'insert-tree': {
      // Fresh ids, so the same saved section can be inserted more than once.
      const incoming = cloneTreeWithNewIds(action.blocks);
      const next = insertBlocksAt(state.history.present, [action.index], incoming);
      return withBlocks(state, next, { selectedId: incoming[0]?.id ?? null });
    }

    case 'remove':
      return withBlocks(state, removeBlockById(state.history.present, action.id));

    case 'duplicate':
      return withBlocks(state, duplicateBlockById(state.history.present, action.id));

    case 'move':
      return withBlocks(state, moveBlock(state.history.present, action.from, action.to));

    case 'set-block-path':
      return withBlocks(
        state,
        updateBlockById(state.history.present, action.id, (block) =>
          setBlockPath(block, action.path, action.value),
        ),
      );

    case 'text-styles':
      return withBlocks(
        state,
        setBlockTextStyles(state.history.present, action.id, action.path, action.runs),
      );

    case 'text-layout':
      return withBlocks(
        state,
        setBlockTextLayout(state.history.present, action.id, action.path, action.layout),
      );

    case 'apply-paths': {
      const next = action.changes.reduce(
        (tree, change) =>
          updateBlockById(tree, action.id, (block) =>
            setBlockPath(block, change.path, change.value),
          ),
        state.history.present,
      );
      return withBlocks(state, next);
    }

    case 'cover':
      return {
        ...state,
        content: {
          ...state.content,
          coverMediaId: action.coverMediaId,
          coverImageUrl: action.coverImageUrl,
        },
      };

    case 'seo':
      return { ...state, content: { ...state.content, seo: action.seo } };

    case 'translate-blocks':
      return withBlocks(state, action.blocks);

    case 'toggle-visibility': {
      const block = findBlockById(state.history.present, action.id);
      const visible = block?.style.visibility[action.device] ?? true;
      return withBlocks(
        state,
        setBlockVisibility(state.history.present, action.id, action.device, !visible),
      );
    }

    case 'undo': {
      const history = undo(state.history);
      if (history === state.history) return state;
      return { ...state, history, selectedId: pruneSelection(state, history.present) };
    }

    case 'redo': {
      const history = redo(state.history);
      if (history === state.history) return state;
      return { ...state, history, selectedId: pruneSelection(state, history.present) };
    }

    case 'saving':
      return { ...state, saveState: 'saving' };

    case 'saved':
      return {
        ...state,
        saveState: 'saved',
        conflict: false,
        lastSavedAt: action.savedAt,
        content: {
          ...state.content,
          blocks: state.history.present,
          revision: action.revision,
          updatedAt: action.savedAt,
        },
      };

    case 'save-failed':
      return { ...state, saveState: 'error' };

    case 'published':
      return {
        ...state,
        content: {
          ...state.content,
          status: 'published',
          publishedAt: action.publishedAt,
          publishedBlocks: state.history.present,
        },
      };

    case 'conflict':
      return {
        ...state,
        conflict: action.conflict,
        saveState: action.conflict ? 'error' : state.saveState,
      };

    case 'drag':
      return {
        ...state,
        draggingId: action.id === undefined ? state.draggingId : action.id,
        dropIndex: action.dropIndex === undefined ? state.dropIndex : action.dropIndex,
      };

    case 'reset':
      return {
        ...initialEditorState(action.content),
        device: state.device,
        mode: state.mode,
        panelMode: state.panelMode,
      };

    default:
      return state;
  }
};

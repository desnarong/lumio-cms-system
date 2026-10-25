import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Autosave,
  createBlockNode,
  findBlockById,
  type BlockDevice,
  type BlockIndexPath,
  type EditorDevice,
} from '@lumio/blocks';
import type {
  BlockEditorMode,
  BlockNode,
  BlockTree,
  ContentDetail,
  SectionTemplate,
  Seo,
  TextLayout,
  TextRun,
} from '@lumio/shared';
import { useT } from '@lumio/ui';
import { ApiError, type ContentApi } from './api.js';
import type { SectionTemplateApi } from './sections.js';
import { editorReducer, initialEditorState, type EditorState } from './state.js';
import type { EditorMode } from './types.js';

export interface EditorNotice {
  title: string;
  description?: string;
  undo?: () => void;
}

export interface UseEditorOptions {
  api: ContentApi;
  contentId: string;
  /** Saved-section library; omit to hide "บันทึกเป็นเทมเพลต". */
  sectionsApi?: SectionTemplateApi;
  /** Skips the initial fetch, e.g. when the page was already rendered. */
  initialContent?: ContentDetail;
  /** Debounce for autosave; the design asks for 2 seconds. */
  autosaveDelay?: number;
  onNotice?: (notice: EditorNotice) => void;
  onError?: (message: string) => void;
}

export interface EditorController {
  state: EditorState;
  blocks: BlockTree;
  selectedBlock: BlockNode | null;
  loading: boolean;
  loadError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  hasUnpublishedChanges: boolean;
  select: (id: string | null) => void;
  setDevice: (device: EditorDevice) => void;
  setMode: (mode: EditorMode) => void;
  setPanelMode: (panelMode: BlockEditorMode) => void;
  insertBlock: (type: string, index: number) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (from: BlockIndexPath, to: BlockIndexPath) => void;
  setBlockPath: (id: string, path: string, value: unknown) => void;
  /** Stores inline colour/size runs for one text path, as one undo step. */
  setTextStyles: (id: string, path: string, runs: TextRun[]) => void;
  /** Stores one text's own position/size, as one undo step. */
  setTextLayout: (id: string, path: string, layout: TextLayout | undefined) => void;
  /** Applies several text edits of one block as one undo step (AI suggestions). */
  applyBlockChanges: (id: string, changes: { path: string; value: unknown }[]) => void;
  /** Stores an accepted SEO suggestion for this page; false when saving failed. */
  applySeo: (seo: Seo) => Promise<boolean>;
  /** Swaps the tree for the assistant's translation, as a single undo step. */
  replaceBlocks: (blocks: BlockTree) => void;
  toggleVisibility: (id: string, device: BlockDevice) => void;
  undo: () => void;
  redo: () => void;
  /** Sections the user saved from this site's edit menu. */
  sections: SectionTemplate[];
  /** Saves one block (with its children) as a reusable section. */
  saveSection: (blockId: string, name: string) => Promise<void>;
  /** Inserts a saved section, with fresh block ids. */
  insertSection: (sectionId: string, index: number) => void;
  removeSection: (sectionId: string) => Promise<void>;
  publish: () => Promise<void>;
  /** Opens the draft on the public site through a short-lived signed link. */
  preview: () => Promise<void>;
  /** Writes the local edits on top of the newest server revision. */
  overwriteConflict: () => Promise<void>;
  /** Throws the local edits away and loads what the server has. */
  reload: () => Promise<void>;
  dismissConflict: () => void;
  startDrag: (id: string) => void;
  setDropIndex: (index: number | null) => void;
  endDrag: () => void;
}

export const CONFLICT_MESSAGE_KEY = 'editor.conflict.message' as const;
const DEFAULT_AUTOSAVE_DELAY = 2000;

const emptyContent = (contentId: string): ContentDetail => ({
  id: contentId,
  type: 'page',
  title: '',
  slug: 'home',
  status: 'draft',
  locale: 'th',
  translationGroupId: contentId,
  excerpt: null,
  revision: 1,
  updatedAt: new Date(0).toISOString(),
  publishedAt: null,
  archivedAt: null,
  blocks: [],
  publishedBlocks: null,
  seo: { noindex: false },
  createdAt: new Date(0).toISOString(),
});

/**
 * Owns the editor's block tree, its undo history, the autosave queue and the
 * keyboard shortcuts. Components stay presentational: everything they need is a
 * plain callback here.
 */
export const useEditor = ({
  api,
  contentId,
  sectionsApi,
  initialContent,
  autosaveDelay = DEFAULT_AUTOSAVE_DELAY,
  onNotice,
  onError,
}: UseEditorOptions): EditorController => {
  const t = useT();
  const [state, dispatch] = useReducer(
    editorReducer,
    initialContent,
    (content): EditorState => initialEditorState(content ?? emptyContent(contentId)),
  );
  const [loading, setLoading] = useState(!initialContent);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionTemplate[]>([]);

  const autosaveRef = useRef<Autosave<BlockTree> | null>(null);
  const revisionRef = useRef(state.content.revision);
  const lastQueuedRef = useRef<BlockTree | null>(initialContent ? initialContent.blocks : null);
  const blocksRef = useRef<BlockTree>(state.history.present);
  const noticeRef = useRef(onNotice);
  const errorRef = useRef(onError);

  revisionRef.current = state.content.revision;
  blocksRef.current = state.history.present;
  noticeRef.current = onNotice;
  errorRef.current = onError;

  useEffect(() => {
    const autosave = new Autosave<BlockTree>({
      delay: autosaveDelay,
      save: async (blocks) => {
        const result = await api.saveBlocks(contentId, {
          blocks,
          baseRevision: revisionRef.current,
        });
        revisionRef.current = result.revision;
        lastQueuedRef.current = blocks;
        dispatch({ type: 'saved', revision: result.revision, savedAt: result.savedAt });
      },
      onError: (error) => {
        if (error instanceof ApiError && error.isConflict) {
          dispatch({ type: 'conflict', conflict: true });
          return;
        }
        dispatch({ type: 'save-failed' });
      },
    });
    autosaveRef.current = autosave;
    return () => {
      autosave.cancel();
      autosaveRef.current = null;
    };
  }, [api, contentId, autosaveDelay]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const content = await api.getContent(contentId);
      lastQueuedRef.current = content.blocks;
      revisionRef.current = content.revision;
      dispatch({ type: 'reset', content });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('editor.loadError'));
    } finally {
      setLoading(false);
    }
  }, [api, contentId, t]);

  useEffect(() => {
    if (initialContent) return;
    void reload();
  }, [initialContent, reload]);

  const blocks = state.history.present;

  useEffect(() => {
    if (lastQueuedRef.current === blocks) return;
    if (lastQueuedRef.current === null) {
      lastQueuedRef.current = blocks;
      return;
    }
    lastQueuedRef.current = blocks;
    dispatch({ type: 'saving' });
    autosaveRef.current?.schedule(blocks);
  }, [blocks]);

  const insertBlock = useCallback((type: string, index: number) => {
    dispatch({ type: 'insert', index, block: createBlockNode(type) });
  }, []);

  const removeBlock = useCallback((id: string) => {
    dispatch({ type: 'remove', id });
    noticeRef.current?.({ title: t('editor.deleted'), undo: () => dispatch({ type: 'undo' }) });
  }, [t]);

  const publish = useCallback(async () => {
    try {
      await autosaveRef.current?.flush();
    } catch {
      errorRef.current?.(t('editor.saveBeforePublishError'));
      return;
    }
    try {
      const result = await api.publish(contentId);
      dispatch({ type: 'published', publishedAt: result.publishedAt });
      noticeRef.current?.({ title: t('editor.published'), description: t('editor.publishedBody') });
    } catch (error) {
      errorRef.current?.(error instanceof Error ? error.message : t('editor.publishError'));
    }
  }, [api, contentId, t]);

  const preview = useCallback(async () => {
    try {
      // Flush pending edits first, so the draft preview matches the editor.
      await autosaveRef.current?.flush();
      const link = await api.createPreviewLink(contentId);
      if (typeof window !== 'undefined') {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      errorRef.current?.(error instanceof Error ? error.message : t('editor.previewError'));
    }
  }, [api, contentId, t]);

  const overwriteConflict = useCallback(async () => {
    const mine = blocksRef.current;
    try {
      const latest = await api.getContent(contentId);
      revisionRef.current = latest.revision;
      const result = await api.saveBlocks(contentId, { blocks: mine, baseRevision: latest.revision });
      revisionRef.current = result.revision;
      lastQueuedRef.current = mine;
      dispatch({ type: 'saved', revision: result.revision, savedAt: result.savedAt });
    } catch (error) {
      dispatch({ type: 'conflict', conflict: true });
      errorRef.current?.(error instanceof Error ? error.message : t('editor.overwriteError'));
    }
  }, [api, contentId, t]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return (
        element.isContentEditable === true ||
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT'
      );
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (!meta) {
        if (event.key === 'Escape') dispatch({ type: 'select', id: null });
        return;
      }
      // Let the browser handle undo inside a text box the user is typing in.
      if (isTypingTarget(event.target) && key !== 's') return;

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: 'undo' });
        return;
      }
      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (key === 's') {
        event.preventDefault();
        void autosaveRef.current?.flush().catch(() => undefined);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!sectionsApi) return undefined;
    let active = true;

    void sectionsApi
      .list()
      .then((items) => {
        if (active) setSections(items);
      })
      .catch(() => {
        // A missing library must not block editing.
        if (active) setSections([]);
      });

    return () => {
      active = false;
    };
  }, [sectionsApi]);

  const saveSection = useCallback(
    async (blockId: string, name: string) => {
      if (!sectionsApi) return;
      const block = findBlockById(blocksRef.current, blockId);
      if (!block) return;

      try {
        const saved = await sectionsApi.create({ name, blocks: [block] });
        setSections((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        noticeRef.current?.({ title: t('editor.sectionSaved'), description: t('editor.sectionSavedBody') });
      } catch (error) {
        errorRef.current?.(error instanceof Error ? error.message : t('editor.sectionSaveError'));
      }
    },
    [sectionsApi, t],
  );

  const insertSection = useCallback(
    (sectionId: string, index: number) => {
      const section = sections.find((item) => item.id === sectionId);
      if (!section) return;
      dispatch({ type: 'insert-tree', index, blocks: section.blocks });
    },
    [sections],
  );

  const removeSection = useCallback(
    async (sectionId: string) => {
      if (!sectionsApi) return;
      const previous = sections;
      setSections((current) => current.filter((item) => item.id !== sectionId));
      try {
        await sectionsApi.remove(sectionId);
        noticeRef.current?.({ title: t('editor.sectionRemoved') });
      } catch (error) {
        setSections(previous);
        errorRef.current?.(error instanceof Error ? error.message : t('editor.sectionRemoveError'));
      }
    },
    [sections, sectionsApi, t],
  );

  const selectedBlock = useMemo(
    () => (state.selectedId ? findBlockById(blocks, state.selectedId) : null),
    [blocks, state.selectedId],
  );

  return {
    state,
    blocks,
    selectedBlock,
    loading,
    loadError,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    hasUnpublishedChanges: state.content.publishedBlocks !== blocks,
    select: useCallback((id: string | null) => dispatch({ type: 'select', id }), []),
    setDevice: useCallback((device: EditorDevice) => dispatch({ type: 'device', device }), []),
    setMode: useCallback((mode: EditorMode) => dispatch({ type: 'mode', mode }), []),
    setPanelMode: useCallback(
      (panelMode: BlockEditorMode) => dispatch({ type: 'panel-mode', panelMode }),
      [],
    ),
    insertBlock,
    removeBlock,
    duplicateBlock: useCallback((id: string) => dispatch({ type: 'duplicate', id }), []),
    moveBlock: useCallback(
      (from: BlockIndexPath, to: BlockIndexPath) => dispatch({ type: 'move', from, to }),
      [],
    ),
    setBlockPath: useCallback(
      (id: string, path: string, value: unknown) =>
        dispatch({ type: 'set-block-path', id, path, value }),
      [],
    ),
    setTextStyles: useCallback(
      (id: string, path: string, runs: TextRun[]) =>
        dispatch({ type: 'text-styles', id, path, runs }),
      [],
    ),
    setTextLayout: useCallback(
      (id: string, path: string, layout: TextLayout | undefined) =>
        dispatch({ type: 'text-layout', id, path, layout }),
      [],
    ),
    applyBlockChanges: useCallback(
      (id: string, changes: { path: string; value: unknown }[]) =>
        dispatch({ type: 'apply-paths', id, changes }),
      [],
    ),
    replaceBlocks: useCallback(
      (next: BlockTree) => dispatch({ type: 'translate-blocks', blocks: next }),
      [],
    ),
    applySeo: useCallback(
      async (seo: Seo) => {
        try {
          await api.update(contentId, { seo });
          dispatch({ type: 'seo', seo });
          return true;
        } catch (error) {
          errorRef.current?.(
            error instanceof Error ? error.message : t('editor.seoError'),
          );
          return false;
        }
      },
      [api, contentId, t],
    ),
    toggleVisibility: useCallback(
      (id: string, device: BlockDevice) => dispatch({ type: 'toggle-visibility', id, device }),
      [],
    ),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
    sections,
    saveSection,
    insertSection,
    removeSection,
    publish,
    preview,
    overwriteConflict,
    reload,
    dismissConflict: useCallback(() => dispatch({ type: 'conflict', conflict: false }), []),
    startDrag: useCallback((id: string) => dispatch({ type: 'drag', id }), []),
    setDropIndex: useCallback((index: number | null) => dispatch({ type: 'drag', dropIndex: index }), []),
    endDrag: useCallback(() => dispatch({ type: 'drag', id: null, dropIndex: null }), []),
  };
};

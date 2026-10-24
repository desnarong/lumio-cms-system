import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FormsCatalogProvider, registry } from '@lumio/blocks';
import {
  themeCssVariables,
  themeDataAttributes,
  type AiSiteCommandProposal,
  type ContentDetail,
  type Form,
  type ThemeTokens,
} from '@lumio/shared';
import { Banner, Button, EmptyState, Modal, Skeleton, TextField, useT, useToast } from '@lumio/ui';
import { AiAssistant } from '../ai/AiAssistant.js';
import type { AiApi } from '../ai/api.js';
import type { DesignApi } from '../design/api.js';
import type { FormsApi } from '../forms/api.js';
import { loadFullForms } from '../forms/useForms.js';
import type { ContentApi } from './api.js';
import type { SectionTemplateApi } from './sections.js';
import { BlockCanvas } from './BlockCanvas.js';
import { BlockInspector } from './BlockInspector.js';
import { EditorToolbar } from './EditorToolbar.js';
import { LanguageBar } from './LanguageBar.js';
import type { EditorTextField } from './types.js';
import { VersionHistoryPanel } from './VersionHistoryPanel.js';
import { CONFLICT_MESSAGE_KEY, useEditor } from './useEditor.js';

export interface EditorPageProps {
  api: ContentApi;
  contentId: string;
  /** Saved-section library for the block menu; omit to hide the action. */
  sectionsApi?: SectionTemplateApi;
  /** Contact forms, so the form block can pick one and preview it. */
  formsApi?: FormsApi;
  /** The AI assistant; omit to hide it entirely. */
  ai?: AiApi;
  /** Design tokens, so a whole-site AI command can be applied and undone. */
  design?: DesignApi;
  /** Skips the initial fetch when the content is already available. */
  initialContent?: ContentDetail;
  autosaveDelay?: number;
  onBack?: () => void;
  onSignOut?: () => void;
  /** Opens another language of this page (docs/design/17-i18n.md 17.3). */
  onOpenContent?: (contentId: string) => void;
}

/**
 * Edit-on-page screen (docs/design/04-ux.md 4.2). The page shows the real site
 * markup; text becomes editable in place, blocks can be added, reordered and
 * restyled, and everything autosaves every couple of seconds. Block panels open
 * the media library through `useMediaPicker`, which the admin shell provides.
 */
export const EditorPage = ({
  api,
  contentId,
  sectionsApi,
  formsApi,
  ai,
  design,
  initialContent,
  autosaveDelay,
  onBack,
  onSignOut,
  onOpenContent,
}: EditorPageProps) => {
  const t = useT();
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [naming, setNaming] = useState<{ id: string; label: string } | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [forms, setForms] = useState<Form[]>([]);
  const [aiFields, setAiFields] = useState<EditorTextField[]>([]);
  const [previewTokens, setPreviewTokens] = useState<ThemeTokens | null>(null);

  // The form block needs the site's forms both for its panel picker (context)
  // and for its live preview (the `forms` prop on the canvas).
  useEffect(() => {
    if (!formsApi) return undefined;
    let active = true;
    void loadFullForms(formsApi)
      .then((loaded) => {
        if (active) setForms(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [formsApi]);

  // The canvas must paint with the site's own colours and density, otherwise the
  // owner sees the admin's default pink accent instead of their brand colours.
  useEffect(() => {
    if (!design) return undefined;
    let active = true;
    void design
      .getTokens()
      .then((designTokens) => {
        if (active) setPreviewTokens(designTokens.tokens);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [design]);

  const previewTheme = useMemo(
    () =>
      previewTokens
        ? {
            style: themeCssVariables(previewTokens) as unknown as CSSProperties,
            attributes: {
              ...themeDataAttributes(previewTokens),
              ...(previewTokens.colorMode === 'dark' ? { 'data-theme': 'dark' } : {}),
            },
          }
        : null,
    [previewTokens],
  );

  const editor = useEditor({
    api,
    contentId,
    ...(sectionsApi ? { sectionsApi } : {}),
    initialContent,
    autosaveDelay,
    onNotice: (notice) =>
      toast.push({
        tone: 'success',
        title: notice.title,
        description: notice.description,
        ...(notice.undo ? { undo: { label: t('editor.undoLabel'), onClick: notice.undo } } : {}),
      }),
    onError: (message) => toast.push({ tone: 'danger', title: message }),
  });

  const { state } = editor;

  const handlePublish = async (): Promise<void> => {
    setPublishing(true);
    try {
      await editor.publish();
    } finally {
      setPublishing(false);
    }
  };

  // The canvas reads the selected block's text from the rendered page, so the
  // assistant always works on what the user actually sees.
  const handleAiFields = useCallback((_blockId: string, fields: EditorTextField[]) => {
    setAiFields(fields);
  }, []);

  const showAiError = useCallback(
    (message: string) => toast.push({ tone: 'danger', title: message }),
    [toast],
  );

  const applyAiText = (changes: { path: string; after: string }[]): void => {
    const id = state.selectedId;
    if (!id || changes.length === 0) return;
    editor.applyBlockChanges(
      id,
      changes.map((change) => ({ path: change.path, value: change.after })),
    );
    toast.push({
      tone: 'success',
      title: t('editor.aiTextApplied'),
      undo: { label: t('editor.undoLabel'), onClick: editor.undo },
    });
  };

  const applyAiSeo = (seo: { title: string; description: string }): void => {
    const previous = state.content.seo;
    const merged = { ...previous, title: seo.title, description: seo.description };
    void editor.applySeo(merged).then((saved) => {
      if (!saved) return;
      toast.push({
        tone: 'success',
        title: t('editor.aiSeoApplied'),
        undo: { label: t('editor.undoLabel'), onClick: () => void editor.applySeo(previous) },
      });
    });
  };

  /**
   * Applies a whole-site design command through the same design API the Design
   * screen uses, and offers the inverse patch as undo so nothing is permanent.
   */
  const applyAiTheme = async (proposal: AiSiteCommandProposal): Promise<boolean> => {
    if (!design) return false;
    try {
      await design.updateTokens(proposal.patch);
      toast.push({
        tone: 'success',
        title: t('ai.chat.applied'),
        undo: {
          label: t('editor.undoLabel'),
          onClick: () => {
            void design.updateTokens(proposal.inversePatch).catch(() => undefined);
          },
        },
      });
      return true;
    } catch {
      toast.push({ tone: 'danger', title: t('ai.chat.applyFailed') });
      return false;
    }
  };

  return (
    <div className="editor-shell">
      <EditorToolbar
        title={state.content.title || t('editor.untitled')}
        status={state.content.status}
        hasUnpublishedChanges={editor.hasUnpublishedChanges}
        saveState={state.saveState}
        device={state.device}
        mode={state.mode}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        publishing={publishing}
        onBack={onBack}
        {...(onSignOut ? { onSignOut } : {})}
        onDeviceChange={editor.setDevice}
        onModeChange={editor.setMode}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onPublish={() => void handlePublish()}
        onPreview={() => void editor.preview()}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <LanguageBar
        api={api}
        contentId={contentId}
        {...(onOpenContent ? { onSwitch: onOpenContent } : {})}
        onCreated={() =>
          toast.push({
            tone: 'success',
            title: t('editor.translationCreated'),
            description: t('editor.translationCheck'),
          })
        }
        onTranslated={(result) => {
          if (result.translatedCount === 0) {
            toast.push({
              tone: 'success',
              title: t('editor.translatedAll'),
              description: t('editor.translatedAllBody', { count: result.totalCount }),
            });
            return;
          }
          editor.replaceBlocks(result.blocks);
          toast.push({
            tone: 'success',
            title: t('editor.translatedCount', { count: result.translatedCount }),
            description: t('editor.translationCheck'),
            undo: { label: t('editor.undoLabel'), onClick: editor.undo },
          });
        }}
        onError={(message) => toast.push({ tone: 'danger', title: message })}
      />

      {state.conflict ? (
        <div className="editor-notice">
          <Banner
            tone="warning"
            title={t(CONFLICT_MESSAGE_KEY)}
            action={
              <div className="editor-notice__actions">
                <Button size="sm" onClick={() => void editor.overwriteConflict()}>
                  {t('editor.conflict.overwrite')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void editor.reload()}>
                  {t('editor.conflict.useLatest')}
                </Button>
              </div>
            }
          />
        </div>
      ) : null}

      <div className="editor-body">
        <FormsCatalogProvider forms={forms}>
          <main className="editor-main">
            {editor.loadError ? (
              <EmptyState
                tone="error"
                title={t('editor.loadError')}
                description={editor.loadError}
                action={
                  <Button variant="secondary" onClick={() => void editor.reload()}>
                    {t('common.retry')}
                  </Button>
                }
              />
            ) : editor.loading ? (
              <div className="editor-loading" aria-busy="true">
                <Skeleton shape="block" height={280} />
                <Skeleton shape="text" lines={3} />
              </div>
            ) : (
              <BlockCanvas
                blocks={editor.blocks}
                selectedId={state.selectedId}
                device={state.device}
                theme={previewTheme}
                draggingId={state.draggingId}
                dropIndex={state.dropIndex}
                onSelect={editor.select}
                onTextChange={editor.setBlockPath}
                onTextStyle={editor.setTextStyles}
                onInsert={editor.insertBlock}
                onDuplicate={editor.duplicateBlock}
                onRemove={editor.removeBlock}
                onToggleVisibility={(id) => editor.toggleVisibility(id, state.device)}
                sections={editor.sections}
                onInsertSection={editor.insertSection}
                {...(sectionsApi
                  ? {
                      onSaveAsTemplate: (id: string) => {
                        const label = editor.blocks.find((block) => block.id === id);
                        setTemplateName(
                          label
                            ? (registry.get(label.type)?.label ?? label.type)
                            : t('editor.newSection'),
                        );
                        setNaming({ id, label: t('editor.saveAsTemplate') });
                      },
                    }
                  : {})}
                onMove={editor.moveBlock}
                onDragStart={editor.startDrag}
                onDropIndex={editor.setDropIndex}
                onDragEnd={editor.endDrag}
                {...(forms.length > 0 ? { forms } : {})}
                onFields={handleAiFields}
              />
            )}
          </main>

          {naming ? (
            <Modal
              open
              size="sm"
              title={t('editor.saveAsTemplate')}
              description={t('editor.saveAsTemplateBody')}
              onClose={() => setNaming(null)}
              footer={
                <div className="editor-modal-actions">
                  <Button variant="ghost" onClick={() => setNaming(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      const target = naming;
                      setNaming(null);
                      void editor.saveSection(
                        target.id,
                        templateName.trim() || t('editor.savedSectionName'),
                      );
                    }}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              }
            >
              <TextField
                id="section-template-name"
                label={t('editor.templateNameLabel')}
                hint={t('editor.templateNameHint')}
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </Modal>
          ) : null}

          <BlockInspector
            block={editor.selectedBlock}
            device={state.device}
            panelMode={state.panelMode}
            onPanelModeChange={editor.setPanelMode}
            onChange={(path, value) =>
              state.selectedId ? editor.setBlockPath(state.selectedId, path, value) : undefined
            }
            onDuplicate={() => state.selectedId && editor.duplicateBlock(state.selectedId)}
            onRemove={() => state.selectedId && editor.removeBlock(state.selectedId)}
            onToggleVisibility={() =>
              state.selectedId && editor.toggleVisibility(state.selectedId, state.device)
            }
            {...(ai
              ? {
                  aiPanel: (
                    <AiAssistant
                      api={ai}
                      pageId={contentId}
                      fields={aiFields}
                      onApplyText={applyAiText}
                      onApplySeo={applyAiSeo}
                      {...(design ? { onApplyTheme: applyAiTheme } : {})}
                      onError={showAiError}
                    />
                  ),
                }
              : {})}
          />
        </FormsCatalogProvider>
      </div>

      <VersionHistoryPanel
        api={api}
        contentId={contentId}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestored={() => void editor.reload()}
      />
    </div>
  );
};

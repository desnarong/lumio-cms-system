import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BlockTree,
  DesignTokens,
  GlobalBlockKind,
  MenuAlign,
  MenuItem,
  MenuLocation,
  SectionTemplate,
  TemplateSummary,
  ThemeTokensPatch,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import type { DesignApi } from './api.js';

export const designErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : translateNow('common.genericError');

/* ------------------------------------------------------------------ tokens */

export interface DesignTokensController {
  tokens: DesignTokens | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => Promise<void>;
  update: (patch: ThemeTokensPatch) => Promise<void>;
  reset: () => Promise<void>;
}

/** Style tab: the site's colours, fonts, corners and motion. */
export const useDesignTokens = (api: DesignApi): DesignTokensController => {
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTokens(await apiRef.current.getTokens());
    } catch (loadError) {
      setError(designErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(async (action: () => Promise<DesignTokens>) => {
    setSaving(true);
    setError(null);
    try {
      setTokens(await action());
    } catch (saveError) {
      setError(designErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }, []);

  const update = useCallback(
    (patch: ThemeTokensPatch) => run(() => apiRef.current.updateTokens(patch)),
    [run],
  );
  const reset = useCallback(() => run(() => apiRef.current.resetTokens()), [run]);

  return { tokens, loading, error, saving, reload, update, reset };
};

/* --------------------------------------------------------------- templates */

export interface TemplatesController {
  templates: TemplateSummary[];
  loading: boolean;
  error: string | null;
  applying: string | null;
  reload: () => Promise<void>;
  apply: (templateId: string, applyHeaderFooter: boolean) => Promise<boolean>;
}

/** Template tab: switch the whole look without touching any content. */
export const useTemplates = (api: DesignApi): TemplatesController => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await apiRef.current.listTemplates());
    } catch (loadError) {
      setError(designErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const apply = useCallback(async (templateId: string, applyHeaderFooter: boolean) => {
    setApplying(templateId);
    setError(null);
    try {
      await apiRef.current.applyTemplate(templateId, { applyHeaderFooter });
      return true;
    } catch (applyError) {
      setError(designErrorMessage(applyError));
      return false;
    } finally {
      setApplying(null);
    }
  }, []);

  return { templates, loading, error, applying, reload, apply };
};

/* ------------------------------------------------------------------- menus */

export interface MenuController {
  items: MenuItem[];
  align: MenuAlign;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setItems: (items: MenuItem[]) => void;
  setAlign: (align: MenuAlign) => void;
  reload: () => Promise<void>;
  /** Resolves `true` after a successful save so the panel can confirm it. */
  save: () => Promise<boolean>;
}

/**
 * Menu tab: the header/footer navigation, which can nest. A language-specific
 * menu starts as a copy of the shared one, so switching language in the panel
 * never shows an empty editor (docs/design/17-i18n.md 17.5).
 */
export const useMenu = (
  api: DesignApi,
  location: MenuLocation,
  locale?: string,
): MenuController => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [align, setAlign] = useState<MenuAlign>('left');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await apiRef.current.getMenu(location, locale);
      const shared =
        loaded.items.length === 0 && locale ? await apiRef.current.getMenu(location) : null;
      setItems(shared ? shared.items : loaded.items);
      setAlign(loaded.align);
    } catch (loadError) {
      setError(designErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [location, locale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiRef.current.updateMenu(location, { items, locale, align });
      setItems(saved.items);
      setAlign(saved.align);
      return true;
    } catch (saveError) {
      setError(designErrorMessage(saveError));
      return false;
    } finally {
      setSaving(false);
    }
  }, [items, align, location, locale]);

  return {
    items,
    align,
    loading,
    error,
    saving,
    setItems,
    setAlign,
    reload,
    save,
  };
};

/* ------------------------------------------------------------ global blocks */

export interface GlobalBlocksController {
  blocks: BlockTree;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setBlocks: (blocks: BlockTree) => void;
  reload: () => Promise<void>;
  /** Resolves `true` after a successful save so the panel can confirm it. */
  save: () => Promise<boolean>;
}

/** Header/footer tab: global blocks rendered on every page. */
export const useGlobalBlocks = (
  api: DesignApi,
  kind: GlobalBlockKind,
): GlobalBlocksController => {
  const [blocks, setBlocks] = useState<BlockTree>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await apiRef.current.getGlobalBlocks();
      setBlocks(all[kind]);
    } catch (loadError) {
      setError(designErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const all = await apiRef.current.updateGlobalBlock(kind, blocks);
      setBlocks(all[kind]);
      return true;
    } catch (saveError) {
      setError(designErrorMessage(saveError));
      return false;
    } finally {
      setSaving(false);
    }
  }, [blocks, kind]);

  return { blocks, loading, error, saving, setBlocks, reload, save };
};

/* ---------------------------------------------------------------- sections */

export interface SectionsController {
  sections: SectionTemplate[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (section: SectionTemplate) => Promise<void>;
}

/** Saved sections tab: rename or delete the sections saved from the editor. */
export const useSections = (api: DesignApi): SectionsController => {
  const [sections, setSections] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSections(await apiRef.current.listSections());
    } catch (loadError) {
      setError(designErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rename = useCallback(
    async (id: string, name: string) => {
      try {
        const updated = await apiRef.current.renameSection(id, { name });
        setSections((current) => current.map((item) => (item.id === id ? updated : item)));
      } catch (renameError) {
        setError(designErrorMessage(renameError));
      }
    },
    [],
  );

  const remove = useCallback(async (section: SectionTemplate) => {
    setSections((current) => current.filter((item) => item.id !== section.id));
    try {
      await apiRef.current.removeSection(section.id);
    } catch (removeError) {
      setError(designErrorMessage(removeError));
      setSections((current) => [...current, section]);
    }
  }, []);

  return { sections, loading, error, reload, rename, remove };
};

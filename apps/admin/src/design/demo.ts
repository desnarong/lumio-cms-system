import { translateNow } from '@lumio/ui';
import { createBlockNode, registerBuiltinBlocks } from '@lumio/blocks';
import {
  applyThemeTokensPatch,
  normalizeThemeTokens,
  type DesignTokens,
  type GlobalBlocks,
  type MenuAlign,
  type MenuItem,
  type MenuLocation,
  type SectionTemplate,
  type SiteChrome,
} from '@lumio/shared';
import { ApiError } from '../api-error.js';
import { demoItems } from '../wizard/demo.js';
import type { DesignApi } from './api.js';

registerBuiltinBlocks();

const defaultMenus = (): Record<MenuLocation, MenuItem[]> => ({
  header: [
    { label: 'หน้าแรก', href: '/', children: [] },
    { label: 'เมนูร้าน', href: '/menu', children: [] },
    { label: 'ที่ตั้งร้าน', href: '/location', children: [] },
    { label: 'ติดต่อเรา', href: '/contact', children: [] },
  ],
  footer: [
    { label: 'นโยบายความเป็นส่วนตัว', href: '/privacy', children: [] },
    { label: 'ติดต่อเรา', href: '/contact', children: [] },
  ],
});

const defaultGlobalBlocks = (): GlobalBlocks => ({
  header: [createBlockNode('heading')],
  footer: [createBlockNode('paragraph')],
});

/** In-memory design backend so every Design screen works before the API is up. */
export const createDemoDesignApi = (): DesignApi => {
  let templateId = demoItems[0]?.id ?? null;
  let tokens = normalizeThemeTokens(demoItems[0]?.tokens ?? {});
  let menus = defaultMenus();
  let menuAlign: Record<MenuLocation, MenuAlign> = { header: 'right', footer: 'left' };
  let globalBlocks = defaultGlobalBlocks();
  let sections: SectionTemplate[] = [];
  let chrome: SiteChrome = {
    headerHeight: 0,
    logoHeight: 0,
    footerBackground: 'brand',
    footerBackgroundImage: '',
    footerOverlay: 60,
    socialLinks: [],
    legalLinks: [],
    copyright: '',
  };

  const design = (): DesignTokens => ({
    tokens,
    templateId,
    styleId: demoItems.find((item) => item.id === templateId)?.styleId ?? null,
  });

  return {
    getTokens: async () => design(),
    updateTokens: async (patch) => {
      tokens = applyThemeTokensPatch(tokens, patch);
      return design();
    },
    resetTokens: async () => {
      const template = demoItems.find((item) => item.id === templateId) ?? demoItems[0];
      tokens = normalizeThemeTokens(template?.tokens ?? {});
      return design();
    },

    listTemplates: async () => demoItems,
    applyTemplate: async (nextId, input) => {
      const template = demoItems.find((item) => item.id === nextId);
      if (!template) throw new ApiError('not_found', translateNow('demo.templateNotFound'), 404);
      templateId = template.id;
      tokens = normalizeThemeTokens(template.tokens);
      if (input.applyHeaderFooter) {
        menus = defaultMenus();
        globalBlocks = defaultGlobalBlocks();
      }
      return { ...design(), headerFooterApplied: input.applyHeaderFooter };
    },

    getMenu: async (location, locale) => ({
      location,
      locale: locale ?? null,
      items: menus[location],
      align: menuAlign[location],
      updatedAt: new Date().toISOString(),
    }),
    updateMenu: async (location, input) => {
      menus = { ...menus, [location]: input.items };
      if (input.align) menuAlign = { ...menuAlign, [location]: input.align };
      return {
        location,
        locale: input.locale ?? null,
        items: menus[location],
        align: menuAlign[location],
        updatedAt: new Date().toISOString(),
      };
    },

    getChrome: async () => chrome,
    updateChrome: async (patch) => {
      chrome = { ...chrome, ...patch };
      return chrome;
    },

    getGlobalBlocks: async () => globalBlocks,
    updateGlobalBlock: async (kind, blocks) => {
      globalBlocks = { ...globalBlocks, [kind]: blocks };
      return globalBlocks;
    },

    listSections: async () => sections,
    createSection: async (input) => {
      const created: SectionTemplate = {
        id: `demo-section-${sections.length + 1}`,
        name: input.name,
        blocks: input.blocks,
        createdAt: new Date().toISOString(),
        createdBy: null,
      };
      sections = [created, ...sections];
      return created;
    },
    renameSection: async (id, input) => {
      const found = sections.find((section) => section.id === id);
      if (!found) throw new ApiError('not_found', translateNow('demo.sectionNotFound'), 404);
      const renamed = { ...found, name: input.name };
      sections = sections.map((section) => (section.id === id ? renamed : section));
      return renamed;
    },
    removeSection: async (id) => {
      if (!sections.some((section) => section.id === id)) {
        throw new ApiError('not_found', translateNow('demo.sectionNotFound'), 404);
      }
      sections = sections.filter((section) => section.id !== id);
    },
  };
};

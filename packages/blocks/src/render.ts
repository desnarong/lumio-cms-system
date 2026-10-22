/**
 * Server-safe entry for the public renderer (`@lumio/blocks/render`).
 *
 * Importing the package barrel (`@lumio/blocks`) also pulls every block panel
 * and, through them, the whole `@lumio/ui` kit. Public pages must not ship that
 * JavaScript (docs/design/14-seo-performance.md 14.2), so the renderer imports
 * this entry instead: block components, the shell, and the pure tree helpers.
 */
export * from './types.js';
export * from './registry.js';
export * from './blocks/common.js';
export * from './engine/editable.js';
export * from './engine/img.js';
export * from './engine/migrate.js';
export * from './engine/paths.js';
export * from './engine/renderer.js';
export * from './engine/shell.js';
export * from './builtins.render.js';

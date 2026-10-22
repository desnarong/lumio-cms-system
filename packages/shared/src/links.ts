import { z } from 'zod';

/**
 * Link safety (docs/design/15-security.md 15.3). An `href` is written by the
 * user and rendered verbatim into an `<a>`, so a `javascript:` (or `data:` /
 * `vbscript:`) value would run script in the visitor's and the admin's browser.
 * This is the single allow-list every link in a block or menu goes through.
 */

/**
 * Schemes that turn a link into code execution or an inline document. Control
 * characters and whitespace are stripped first so `java\nscript:` cannot slip
 * past the check.
 */
const UNSAFE_SCHEME = /^(?:javascript|data|vbscript|file):/i;

/** Drops control characters and whitespace, mirroring how a browser reads a URL. */
const compactUrl = (value: string): string =>
  [...value].filter((char) => char.charCodeAt(0) > 0x20 && char.charCodeAt(0) !== 0x7f).join('');

/** True when a value is safe to place in an `href`. */
export const isSafeLink = (value: string): boolean => !UNSAFE_SCHEME.test(compactUrl(value));

/**
 * Link schema for buttons and menus. Relative paths, `#`, `http(s):`, `mailto:`
 * and `tel:` all pass; dangerous schemes are rejected so the renderer falls
 * back to a safe default instead of emitting them.
 */
export const safeLinkSchema = z.string().refine(isSafeLink, {
  message: 'ลิงก์นี้ไม่ปลอดภัย กรุณาใช้ที่อยู่เว็บปกติ',
});
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bt } from './i18n.js';
import { BLOCK_EN } from './messages.en.js';

const srcRoot = fileURLToPath(new URL('.', import.meta.url));
// Content defaults and registry labels are not UI text: the first is the copy a
// site owner edits, the second already carries `labelEn`.
const NOT_UI =
  /(\.test\.|\.spec\.|\.stories\.|[\\/]schema\.ts$|[\\/]defaults\.ts$|[\\/]index\.ts$|builtins(\.render)?\.ts$|[\\/]i18n\.ts$|messages\.en\.ts$|[\\/]catalog\.ts$)/;
// ฿ (U+0E3F) is in the Thai block but is a currency sign, not Thai text.
const THAI = /[฀-฾เ-๿]/;
const BT_CALL = /\bbt\(\s*'((?:[^'\\]|\\.)*)'/g;
const SCHEMA_DEFAULT = /\.default\(\s*'(?:[^'\\]|\\.)*'/g;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !NOT_UI.test(path) ? [path] : [];
  });

const files = sourceFiles(srcRoot).map((path) => ({
  path: relative(srcRoot, path),
  text: readFileSync(path, 'utf8'),
}));

const isComment = (line: string): boolean => {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
};

describe('block text i18n', () => {
  it('has English for every Thai string passed to bt()', () => {
    const missing = files.flatMap(({ path, text }) =>
      [...text.matchAll(BT_CALL)]
        .map((match) => (match[1] ?? '').replace(/\\'/g, "'"))
        .filter((thai) => THAI.test(thai) && !(thai in BLOCK_EN))
        .map((thai) => `${path}: ${thai}`),
    );
    expect(missing).toEqual([]);
  });

  it('leaves no Thai UI text outside bt()', () => {
    const stray = files.flatMap(({ path, text }) =>
      // Strip translated calls (which may wrap across lines) and schema defaults,
      // which are content, before looking for Thai that is left over.
      text
        .replace(BT_CALL, (match) => match.replace(/[^\n]/g, ' '))
        .replace(SCHEMA_DEFAULT, (match) => match.replace(/[^\n]/g, ' '))
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => !isComment(line) && THAI.test(line))
        .map(({ index }) => `${path}:${index + 1}`),
    );
    expect(stray).toEqual([]);
  });

  it('keeps placeholders identical in both languages', () => {
    const names = (message: string) =>
      [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const [thai, english] of Object.entries(BLOCK_EN)) {
      expect(names(english), thai).toEqual(names(thai));
    }
  });

  it('translates for the page locale and falls back to the Thai source', () => {
    expect(bt('อ่านต่อ', 'en')).toBe('Read more');
    expect(bt('อ่านต่อ', 'th')).toBe('อ่านต่อ');
    expect(bt('ข้อความที่ไม่มีคำแปล', 'en')).toBe('ข้อความที่ไม่มีคำแปล');
    expect(bt('ยังไม่รองรับบล็อกประเภท “{type}”', 'en', { type: 'map' })).toBe(
      'Block type “map” is not supported yet',
    );
  });
});

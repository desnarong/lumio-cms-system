import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { ERROR_EN } from './error-messages.en';
import { translateErrorMessage } from './error-messages';

const THAI = /[฀-฾เ-๿]/u;
const API_SRC = resolve(__dirname, '..');
const SHARED_SRC = resolve(__dirname, '../../../../packages/shared/src');

/** Calls whose Thai argument ends up in an error a client sees. */
const API_CALLEE = /Exception$|^ApiException\.\w+$|Error$/;
const ZOD_CALLEE =
  /\.(min|max|length|regex|email|url|refine|superRefine|int|positive|nonnegative|gte|lte|uuid|startsWith|endsWith|nonempty)$/;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === 'dist') return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.ts$/.test(name) && !/\.(spec|test)\.ts$/.test(name) ? [path] : [];
  });

/** `${a} and ${b}` → `{1} and {2}`, the hole style ERROR_EN uses. */
const shapeOf = (node: ts.Node): string | undefined => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return (
      node.head.text +
      node.templateSpans.map((span, index) => `{${index + 1}}${span.literal.text}`).join('')
    );
  }
  return undefined;
};

const thrownMessages = (root: string, callee: RegExp): Map<string, string> => {
  const found = new Map<string, string>();
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, 'utf8');
    if (!THAI.test(text)) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (
        (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
        callee.test(node.expression.getText(source))
      ) {
        for (const arg of node.arguments ?? []) {
          const candidates: ts.Node[] = [arg];
          if (ts.isObjectLiteralExpression(arg)) {
            for (const property of arg.properties) {
              if (
                ts.isPropertyAssignment(property) &&
                /message|error/.test(property.name.getText(source))
              ) {
                candidates.push(property.initializer);
              }
            }
          }
          for (const candidate of candidates) {
            const shape = shapeOf(candidate);
            if (shape && THAI.test(shape)) found.set(shape, relative(root, file));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
};

describe('ERROR_EN', () => {
  it('has English for every Thai error the API and its schemas throw', () => {
    const thrown = new Map([
      ...thrownMessages(API_SRC, API_CALLEE),
      ...thrownMessages(SHARED_SRC, ZOD_CALLEE),
    ]);
    const missing = [...thrown]
      .filter(([message]) => !(message in ERROR_EN))
      .map(([m, f]) => `${f}: ${m}`);

    expect(missing).toEqual([]);
  });

  it('keeps Thai out of the English and the holes in step', () => {
    for (const [thai, english] of Object.entries(ERROR_EN)) {
      expect(english, thai).not.toMatch(THAI);
      const holes = (text: string) => [...text.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort();
      expect(holes(english), thai).toEqual(holes(thai));
    }
  });
});

describe('translateErrorMessage', () => {
  it('returns English for an exact message', () => {
    expect(translateErrorMessage('ไม่พบเว็บนี้', 'en')).toBe('Site not found');
  });

  it('fills the holes of a message built from values', () => {
    expect(translateErrorMessage('สินค้า "เสื้อยืด" มีไม่พอ', 'en')).toBe(
      'Not enough stock for "เสื้อยืด"',
    );
    expect(
      translateErrorMessage('แพ็กนี้ต้องใช้ Lumio เวอร์ชัน 2.0.0 ขึ้นไป (เวอร์ชันนี้ 1.4.0)', 'en'),
    ).toBe('This pack needs Lumio 2.0.0 or later (this is 1.4.0)');
  });

  it('keeps Thai for Thai requests and for messages it does not know', () => {
    expect(translateErrorMessage('ไม่พบเว็บนี้', 'th')).toBe('ไม่พบเว็บนี้');
    expect(translateErrorMessage('ข้อความใหม่ที่ยังไม่มีคำแปล', 'en')).toBe(
      'ข้อความใหม่ที่ยังไม่มีคำแปล',
    );
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * AGENTS.md rule 3: components never hard-code colours, they use tokens. This
 * scans every component file in the monorepo for a quoted hex literal, so a
 * new one fails CI instead of slipping into review. Values a CSS variable
 * cannot reach live in `literalColors` / `socialColors` (tokens.ts).
 */
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const ROOTS = ['apps/admin/src', 'apps/renderer/src', 'packages/blocks/src', 'packages/ui/src'];
const SKIP = /(\.test\.|\.spec\.|\.stories\.)/;
const QUOTED_HEX = /['"`]#[0-9a-fA-F]{3,8}\b/;

const componentFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return componentFiles(path);
    return path.endsWith('.tsx') && !SKIP.test(name) ? [path] : [];
  });

describe('design tokens are the only source of colour', () => {
  it('finds no quoted hex colour in component files', () => {
    const offenders = ROOTS.flatMap((root) => componentFiles(join(repoRoot, root))).flatMap(
      (file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => QUOTED_HEX.test(line) && !line.trimStart().startsWith('//'))
          .map(({ index }) => `${relative(repoRoot, file)}:${index + 1}`),
    );
    expect(offenders).toEqual([]);
  });
});

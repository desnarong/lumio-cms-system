import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const KINDS = ['patch', 'minor', 'major'];

/** Writes a package.json back with the same two-space formatting pnpm uses. */
const writeJson = async (path, value) => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

/** Every workspace package that ships with the root version. */
const workspaceManifests = async () => {
  const paths = [join(ROOT, 'package.json')];
  for (const group of ['apps', 'packages']) {
    let entries = [];
    try {
      entries = await readdir(join(ROOT, group), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) paths.push(join(ROOT, group, entry.name, 'package.json'));
    }
  }
  return paths;
};

const kind = process.argv[2] ?? 'patch';
if (!KINDS.includes(kind)) {
  console.error(`usage: node scripts/bump-version.mjs [${KINDS.join('|')}]`);
  process.exit(1);
}

const rootPath = join(ROOT, 'package.json');
const root = await readJson(rootPath);
const [major, minor, patch] = root.version.split('.').map((part) => Number(part) || 0);

const next =
  kind === 'major'
    ? `${major + 1}.0.0`
    : kind === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

const changed = [];
for (const path of await workspaceManifests()) {
  const manifest = await readJson(path);
  if (manifest.version === next) continue;
  manifest.version = next;
  await writeJson(path, manifest);
  changed.push(manifest.name ?? path);
}

console.log(`${root.version} -> ${next}`);
console.log(`updated: ${changed.join(', ')}`);

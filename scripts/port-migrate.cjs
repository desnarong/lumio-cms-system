/**
 * One-off migration: move every local service port into the 49xxx range.
 *
 *   3000 renderer     -> 49200      4000 API          -> 49100
 *   5173 admin        -> 49300      5432 postgres     -> 49432
 *   6379 redis        -> 49537      9000 minio s3     -> 49600
 *                                9001 minio console -> 49601
 *
 * Run `node scripts/port-migrate.cjs` to apply, or `--check` for a dry run.
 */
const fs = require('fs');
const path = require('path');

const RULES = [
  ['localhost:5432', 'localhost:49432'],
  ['localhost:6379', 'localhost:49537'],
  ['localhost:9001', 'localhost:49601'],
  ['localhost:9000', 'localhost:49600'],
  ['localhost:5173', 'localhost:49300'],
  ['localhost:4000', 'localhost:49100'],
  ['localhost:3000', 'localhost:49200'],
  ['127.0.0.1:3000', '127.0.0.1:49200'],
  ['127.0.0.1:4000', '127.0.0.1:49100'],
  ['api:4000', 'api:49100'],
  ['renderer:3000', 'renderer:49200'],
  ['":9001"', '":49601"'],
  ["'5432:5432'", "'49432:5432'"],
  ["'6379:6379'", "'49537:6379'"],
  ["'9000:9000'", "'49600:9000'"],
  ["'9001:9001'", "'49601:9001'"],
  ["'4000:4000'", "'49100:49100'"],
  ["'3000:3000'", "'49200:49200'"],
  ["'5173:80'", "'49300:80'"],
  ["'80:80'", "'49800:80'"],
  ["'443:443'", "'49443:443'"],
  ['"80:80"', '"49800:80"'],
  ['"443:443"', '"49443:443"'],
  ['- 5432:5432', '- 49432:5432'],
  ['EXPOSE 4000', 'EXPOSE 49100'],
  ['EXPOSE 3000', 'EXPOSE 49200'],
  ['next dev -p 3000', 'next dev -p 49200'],
  ['next start -p 3000', 'next start -p 49200'],
  ['port: 5173', 'port: 49300'],
  ['API_PORT ?? 4000', 'API_PORT ?? 49100'],
  ["API_PORT ?? '4000'", "API_PORT ?? '49100'"],
  ['API_PORT=4000', 'API_PORT=49100'],
  ['Baandoi.Example.Com:3000', 'Baandoi.Example.Com:49200'],
  ['[::1]:3000', '[::1]:49200'],
];

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  '.turbo',
  'coverage',
  '.media',
  'build',
  'storybook-static',
]);
const EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|json|yml|yaml|md|txt|env|example|conf)$/i;

const collect = (dir, out) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else out.push(full);
  }
};

const isTarget = (file) => {
  const name = path.basename(file);
  if (name === '.env' || name === '.env.example' || name === 'Caddyfile') return true;
  if (name === 'port-migrate.cjs') return false;
  return EXTENSIONS.test(name);
};

const files = [];
collect(process.cwd(), files);

const check = process.argv.includes('--check');
let touched = 0;

for (const file of files.sort()) {
  if (!isTarget(file)) continue;
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  let next = content;
  let hits = 0;
  for (const [from, to] of RULES) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      hits += 1;
    }
  }
  if (next === content) continue;
  touched += 1;
  const rel = path.relative(process.cwd(), file);
  console.log(`${check ? 'WOULD UPDATE' : 'UPDATED'} ${rel}  [${hits} rule(s)]`);
  if (!check) fs.writeFileSync(file, next, 'utf8');
}

console.log(`\n${check ? 'Would update' : 'Updated'} ${touched} file(s).`);

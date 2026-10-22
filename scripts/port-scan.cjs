const fs = require('fs');
const path = require('path');

const skip = new Set(['node_modules', '.git', '.next', 'dist', '.turbo', 'coverage', '.media', 'build']);
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
})('.');

const ports = '3000|4000|5173|5432|6379|9000|9001';
const re = new RegExp(
  `localhost:(${ports})\\b|\\b(${ports}):(${ports})\\b|port:\\s*(${ports})\\b|\\bAPI_PORT\\b|next dev -p|:${ports}\\b`,
);

for (const file of files) {
  const name = path.basename(file);
  if (!/\.(ts|tsx|js|mjs|json|yml|yaml|md|txt|env|example)$/i.test(file) && !/Caddyfile|\.env/.test(name)) {
    continue;
  }
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  content.split('\n').forEach((line, i) => {
    if (re.test(line)) {
      console.log(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
    }
  });
}

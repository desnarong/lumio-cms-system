#!/usr/bin/env node
/**
 * Cleans Crush's per-project cache so the file tools stop serving stale content
 * and stop refusing edits.
 *
 * Background: Crush keeps two caches in `.crush/crush.db` (SQLite):
 *   - `files`      content snapshots of every file it touched, keyed by
 *                  (path, session_id, version)
 *   - `read_files` "this session already read this file" markers that the
 *                  edit tool checks before it will touch a file
 *
 * Both grow across sessions. Old rows make the tools serve an outdated copy of a
 * file or report "you must read the file before editing it" even after a read.
 * This script drops the cache rows of every session except the newest ones; your
 * conversation history (`messages`/`sessions`) is left untouched.
 *
 * Usage (run it while Crush is closed for best results):
 *   node scripts/prune-crush-cache.mjs                 # report only (dry run)
 *   node scripts/prune-crush-cache.mjs --apply         # keep the newest session
 *   node scripts/prune-crush-cache.mjs --apply --keep 3
 *   node scripts/prune-crush-cache.mjs --apply --vacuum
 *   node scripts/prune-crush-cache.mjs --apply --path page.test.tsx
 *
 * `--path <substring>` also drops every cached version of matching files in the
 * kept sessions, which forces the next read to come from disk. Use it when one
 * specific file keeps showing old content.
 */

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(repoRoot, '.crush', 'crush.db');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const apply = has('--apply');
const vacuum = has('--vacuum');
const keep = Number.parseInt(valueOf('--keep', '1'), 10);
const pathFilter = valueOf('--path', null);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const loadSqlite = () => {
  try {
    return require('node:sqlite');
  } catch {
    console.error('ต้องใช้ Node.js 22.5 ขึ้นไป (โมดูล node:sqlite) — เวอร์ชันปัจจุบัน: ' + process.version);
    process.exit(1);
  }
};

if (!existsSync(dbPath)) {
  console.error(`ไม่พบฐานข้อมูลแคชของ Crush: ${dbPath}`);
  process.exit(1);
}

const sqlite = loadSqlite();
const db = new sqlite.DatabaseSync(dbPath);

const sizeBefore = statSync(dbPath).size;
const sessions = db
  .prepare('select id, title, updated_at from sessions order by updated_at desc')
  .all();

const keepIds = sessions.slice(0, Number.isFinite(keep) && keep > 0 ? keep : 1).map((row) => row.id);
const placeholders = keepIds.map(() => '?').join(', ');

const countRows = (table) => db.prepare(`select count(*) c from ${table}`).get().c;
const filesBefore = countRows('files');
const readsBefore = countRows('read_files');

console.log(`ฐานข้อมูล: ${dbPath}`);
console.log(`ขนาด: ${mb(sizeBefore)} · sessions: ${sessions.length} · files: ${filesBefore} · read_files: ${readsBefore}`);
console.log(`จะเก็บ session ล่าสุด: ${keepIds.join(', ')}`);

const staleFiles = db
  .prepare(`select count(*) c from files where session_id not in (${placeholders})`)
  .get(...keepIds).c;
const staleReads = db
  .prepare(`select count(*) c from read_files where session_id not in (${placeholders})`)
  .get(...keepIds).c;
const patchedFiles = pathFilter
  ? db
      .prepare(
        `select count(*) c from files where session_id in (${placeholders}) and path like ?`,
      )
      .get(...keepIds, `%${pathFilter}%`).c
  : 0;
const patchedReads = pathFilter
  ? db
      .prepare(
        `select count(*) c from read_files where session_id in (${placeholders}) and path like ?`,
      )
      .get(...keepIds, `%${pathFilter}%`).c
  : 0;

console.log(`จะลบ: files ${staleFiles} แถว, read_files ${staleReads} แถว (session เก่า)`);
if (pathFilter) {
  console.log(
    `จะลบเพิ่ม (path มี "${pathFilter}"): files ${patchedFiles} แถว, read_files ${patchedReads} แถว`,
  );
}

if (!apply) {
  console.log('\nโหมดรายงานเท่านั้น — ใส่ --apply เพื่อลบจริง (สำรองฐานข้อมูลให้ก่อนอัตโนมัติ)');
  process.exit(0);
}

const backupDir = join(repoRoot, '.crush', 'backups');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(backupDir, `crush-${stamp}.db`);

try {
  // A consistent snapshot even while Crush holds the database open (WAL mode).
  db.exec(`vacuum into '${backupPath.replace(/'/g, "''")}'`);
  console.log(`สำรองข้อมูลแล้ว: ${backupPath}`);
} catch (error) {
  const fallback = join(backupDir, `crush-${stamp}.copy.db`);
  copyFileSync(dbPath, fallback);
  console.warn(`vacuum into ล้มเหลว (${error.message}) — คัดลอกไฟล์แทน: ${fallback}`);
}

const prune = () => {
  db.exec('begin immediate');
  try {
    db.prepare(`delete from files where session_id not in (${placeholders})`).run(...keepIds);
    db.prepare(`delete from read_files where session_id not in (${placeholders})`).run(...keepIds);
    if (pathFilter) {
      db.prepare(
        `delete from files where session_id in (${placeholders}) and path like ?`,
      ).run(...keepIds, `%${pathFilter}%`);
      db.prepare(
        `delete from read_files where session_id in (${placeholders}) and path like ?`,
      ).run(...keepIds, `%${pathFilter}%`);
    }
    db.exec('commit');
  } catch (error) {
    db.exec('rollback');
    throw error;
  }
};

try {
  prune();
  console.log(
    `ลบแล้ว — files ${filesBefore} → ${countRows('files')}, read_files ${readsBefore} → ${countRows('read_files')}`,
  );
} catch (error) {
  console.error(`ลบไม่สำเร็จ (${error.message}) — ปิด Crush แล้วลองใหม่`);
  process.exit(1);
}

if (vacuum) {
  try {
    db.exec('vacuum');
    console.log('จัดเก็บพื้นที่แล้ว (vacuum)');
  } catch (error) {
    console.warn(`vacuum ไม่สำเร็จ (${error.message}) — ปิด Crush แล้วรันใหม่เพื่อคืนพื้นที่`);
  }
}

console.log(`ขนาดไฟล์ฐานข้อมูล: ${mb(statSync(dbPath).size)} (ก่อน ${mb(sizeBefore)})`);
console.log('ถ้า Crush ยังเปิดอยู่ ให้ปิดแล้วเปิดใหม่ เพื่อให้ทุกอย่างเริ่มจากแคชที่สะอาด');

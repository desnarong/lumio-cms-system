#!/usr/bin/env node
/**
 * Lumio self-update (docs/design/18-deployment.md 18.8).
 *
 * The admin only *reports* the version, because a process cannot reliably
 * rebuild the container it is running in. This script runs on the host and does
 * the real work:
 *
 *   node scripts/update.mjs --check   # say whether a newer release exists
 *   node scripts/update.mjs           # update once, if one exists
 *   node scripts/update.mjs --auto    # keep checking on an interval
 *
 * The update checks out the release tag, rebuilds the compose stack, waits for
 * `/api/health`, and rolls back to the previous commit when the new build does
 * not come up. It refuses to run on a dirty working tree, so no local edit can
 * be lost.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = 'https://github.com/desnarong/lumio-cms-system/releases';

export const normalizeVersion = (version) =>
  String(version ?? '')
    .trim()
    .replace(/^v/i, '');

/** Turns the browser releases page into the GitHub API endpoint. */
export const normalizeManifestUrl = (raw) => {
  const value = String(raw ?? '').trim();
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)\/releases\/?$/i.exec(value);
  return match ? `https://api.github.com/repos/${match[1]}/${match[2]}/releases/latest` : value;
};

/** Same ordering as packages/shared/src/version.ts, kept dependency-free. */
export const compareVersions = (left, right) => {
  const split = (version) => {
    const [core, ...rest] = normalizeVersion(version).split('-');
    const numbers = (core ?? '0').split('.').map((part) => Number.parseInt(part, 10) || 0);
    return [numbers, rest.join('-')];
  };
  const [leftNumbers, leftPre] = split(left);
  const [rightNumbers, rightPre] = split(right);
  for (let index = 0; index < Math.max(leftNumbers.length, rightNumbers.length); index += 1) {
    const a = leftNumbers[index] ?? 0;
    const b = rightNumbers[index] ?? 0;
    if (a !== b) return a > b ? 1 : -1;
  }
  if (leftPre === rightPre) return 0;
  if (leftPre.length === 0) return 1;
  if (rightPre.length === 0) return -1;
  return leftPre > rightPre ? 1 : -1;
};

export const readCurrentVersion = () =>
  normalizeVersion(
    JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).version ?? '0.0.0',
  );

/** Reads the release manifest, or a GitHub release payload. */
export const readLatestVersion = async (manifestUrl) => {
  const response = await fetch(manifestUrl, {
    headers: {
      accept: 'application/vnd.github+json, application/json',
      'user-agent': 'Lumio-CMS-updater',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`อ่านข้อมูลเวอร์ชันล่าสุดไม่สำเร็จ (HTTP ${response.status})`);

  const payload = await response.json();
  const version = payload?.version ?? payload?.tag_name;
  if (typeof version !== 'string' || version.trim().length === 0) {
    throw new Error('ข้อมูลเวอร์ชันล่าสุดไม่ถูกต้อง');
  }
  return normalizeVersion(version);
};

/** Tag names a release may use; the first one that exists wins. */
export const tagCandidates = (version) => [
  `v${normalizeVersion(version)}`,
  normalizeVersion(version),
];

const capture = (command, args) =>
  execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const run = (command, args) => execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const intervalMs = () => {
  const minutes = Number(process.env.LUMIO_UPDATE_INTERVAL_MINUTES ?? 360);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 360 * 60_000;
};

const waitForHealth = async () => {
  const url = process.env.LUMIO_HEALTH_URL ?? 'http://127.0.0.1:49100/api/health';
  const seconds = Number(process.env.LUMIO_UPDATE_HEALTH_TIMEOUT_SECONDS ?? 180);
  const deadline = Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 180) * 1_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (response.ok) return;
    } catch {
      // The new container has not finished booting yet.
    }
    await sleep(5_000);
  }
  throw new Error(`ระบบใหม่ไม่ตอบสนองภายในเวลาที่กำหนด (${url})`);
};

const resolveTag = (version) => {
  for (const tag of tagCandidates(version)) {
    try {
      capture('git', ['rev-parse', '--verify', `refs/tags/${tag}`]);
      return tag;
    } catch {
      // Try the next spelling after fetching.
    }
  }
  return null;
};

const assertCleanTree = () => {
  if (capture('git', ['status', '--porcelain']) !== '') {
    throw new Error('มีไฟล์ที่ยังไม่ commit อยู่ จึงยังไม่อัปเดต (commit หรือ stash ก่อน)');
  }
};

const buildStack = () => run('docker', ['compose', '--profile', 'app', 'up', '-d', '--build']);

const applyUpdate = async (latest) => {
  assertCleanTree();

  console.log(`กำลังอัปเดตเป็น ${latest}…`);
  run('git', ['fetch', '--tags', '--force', 'origin']);
  const tag = resolveTag(latest);
  if (!tag) throw new Error(`ไม่พบ tag ของเวอร์ชัน ${latest}`);

  const previous = capture('git', ['rev-parse', 'HEAD']);
  run('git', ['checkout', '--detach', tag]);

  try {
    buildStack();
    await waitForHealth();
    console.log(`อัปเดตเป็น ${latest} เรียบร้อย`);
  } catch (error) {
    console.error(`อัปเดตไม่สำเร็จ กำลังย้อนกลับไป ${previous.slice(0, 7)}…`);
    run('git', ['checkout', '--detach', previous]);
    buildStack();
    await waitForHealth().catch(() => undefined);
    throw error;
  }
};

const main = async () => {
  const flags = new Set(process.argv.slice(2));
  const checkOnly = flags.has('--check') || flags.has('--dry-run');
  const auto = flags.has('--auto') || flags.has('--watch');
  const manifestUrl = normalizeManifestUrl(
    process.env.LUMIO_UPDATE_MANIFEST_URL ?? DEFAULT_MANIFEST,
  );

  do {
    try {
      const current = readCurrentVersion();
      const latest = await readLatestVersion(manifestUrl);

      if (compareVersions(latest, current) > 0) {
        console.log(`มีเวอร์ชันใหม่ ${latest} (ตอนนี้ ${current})`);
        if (checkOnly) {
          console.log('โหมดตรวจเท่านั้น: รันโดยไม่ใส่ --check เพื่ออัปเดต');
        } else {
          await applyUpdate(latest);
        }
      } else {
        console.log(`เป็นเวอร์ชันล่าสุดแล้ว (${current})`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      if (!auto) process.exitCode = 1;
    }

    if (!auto) break;
    await sleep(intervalMs());
  } while (true);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}

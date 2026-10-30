/** A `1.2.3` or `v1.2.3` string reduced to the part that can be compared. */
export const normalizeVersion = (version: string): string => version.trim().replace(/^v/i, '');

/**
 * Numeric comparison of `1.2.3` style versions. A pre-release (`1.2.3-beta.1`)
 * sorts before its release (`1.2.3`), so an update to a stable release is never
 * missed. Unparseable parts count as zero instead of throwing, because the
 * version comes from a remote manifest.
 */
export const compareVersions = (left: string, right: string): number => {
  const split = (version: string): [number[], string] => {
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

/** True when `candidate` is a release this installation does not have yet. */
export const isNewerVersion = (candidate: string | null, current: string): boolean =>
  candidate !== null && candidate.trim().length > 0 && compareVersions(candidate, current) > 0;

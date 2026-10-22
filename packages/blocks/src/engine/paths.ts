import type { BlockNode } from '@lumio/shared';

const toSegments = (path: string): string[] =>
  path.split('.').filter((segment) => segment.length > 0);

const readChild = (source: unknown, key: string): unknown => {
  if (Array.isArray(source)) {
    const index = Number(key);
    return Number.isInteger(index) ? source[index] : undefined;
  }
  if (source !== null && typeof source === 'object') {
    return (source as Record<string, unknown>)[key];
  }
  return undefined;
};

const writeChild = (source: unknown, key: string, value: unknown): unknown => {
  if (Array.isArray(source)) {
    const index = Number(key);
    const copy = [...source];
    copy[index] = value;
    return copy;
  }
  const base =
    source !== null && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  return { ...base, [key]: value };
};

/** Reads `props.buttons.0.label` style paths without throwing on missing branches. */
export const getPath = (source: unknown, path: string): unknown => {
  let current: unknown = source;
  for (const segment of toSegments(path)) {
    current = readChild(current, segment);
  }
  return current;
};

/** Immutably writes a `props.…` / `style.…` path, copying only the touched branches. */
export const setPath = <T>(source: T, path: string, value: unknown): T => {
  const [head, ...rest] = toSegments(path);
  if (head === undefined) {
    return value as T;
  }
  const next = setPath(readChild(source, head), rest.join('.'), value);
  return writeChild(source, head, next) as T;
};

/** Returns a new block node with one panel change applied. */
export const setBlockPath = (block: BlockNode, path: string, value: unknown): BlockNode =>
  setPath(block, path, value);

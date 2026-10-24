import type { TextRun } from '@lumio/shared';

/** One slice of a text prop and the run that styles it, if any. */
export interface TextSegment {
  text: string;
  run: TextRun | null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Keeps only runs that fit the text, sorted, then merges neighbours with the same style. */
export const normalizeRuns = (runs: readonly TextRun[], length: number): TextRun[] => {
  const kept = runs
    .map((run) => ({
      ...run,
      start: clamp(run.start, 0, length),
      end: clamp(run.end, 0, length),
    }))
    .filter((run) => run.end > run.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: TextRun[] = [];
  for (const run of kept) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.end === run.start &&
      previous.color === run.color &&
      previous.size === run.size &&
      previous.colorHex === run.colorHex &&
      previous.sizePx === run.sizePx
    ) {
      previous.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
};

/**
 * Applies one colour/size patch over a character range. Existing runs are cut
 * at the edges of the selection, so a partially selected run keeps the part
 * that sits outside it.
 */
export const applyTextRun = (
  runs: readonly TextRun[],
  start: number,
  end: number,
  patch: Partial<Pick<TextRun, 'color' | 'size' | 'colorHex' | 'sizePx'>>,
  length: number,
): TextRun[] => {
  if (end <= start) return normalizeRuns(runs, length);

  const next: TextRun[] = [];
  for (const run of runs) {
    if (run.end <= start || run.start >= end) {
      next.push(run);
      continue;
    }
    if (run.start < start) next.push({ ...run, end: start });
    if (run.end > end) next.push({ ...run, start: end });
  }

  next.push({ start, end, ...patch });
  return normalizeRuns(next, length);
};

/** Splits a text prop into the plain and styled slices the renderer outputs. */
export const textSegments = (value: string, runs: readonly TextRun[] = []): TextSegment[] => {
  const usable = normalizeRuns(runs, value.length);
  if (usable.length === 0) return [{ text: value, run: null }];

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const run of usable) {
    if (run.start > cursor) segments.push({ text: value.slice(cursor, run.start), run: null });
    segments.push({ text: value.slice(run.start, run.end), run });
    cursor = run.end;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), run: null });
  return segments.filter((segment) => segment.text.length > 0);
};

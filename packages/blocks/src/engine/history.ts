/**
 * Undo/redo stack for the editor. Pure data so the editor's reducer stays
 * testable; the design calls for unlimited history (docs/design/04-ux.md 4.2),
 * so `limit` defaults to Infinity and only exists to cap memory in tests.
 */
export interface History<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
  limit: number;
}

export const createHistory = <T>(present: T, limit = Number.POSITIVE_INFINITY): History<T> => ({
  past: [],
  present,
  future: [],
  limit,
});

export const pushHistory = <T>(history: History<T>, present: T): History<T> => {
  if (Object.is(present, history.present)) return history;
  const past = [...history.past, history.present];
  const trimmed = Number.isFinite(history.limit)
    ? past.slice(Math.max(0, past.length - history.limit))
    : past;
  return { past: trimmed, present, future: [], limit: history.limit };
};

export const canUndo = <T>(history: History<T>): boolean => history.past.length > 0;

export const canRedo = <T>(history: History<T>): boolean => history.future.length > 0;

export const undo = <T>(history: History<T>): History<T> => {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    limit: history.limit,
  };
};

export const redo = <T>(history: History<T>): History<T> => {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
    limit: history.limit,
  };
};

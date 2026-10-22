import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, createHistory, pushHistory, redo, undo } from './history.js';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const history = createHistory(['a']);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('walks back through every change', () => {
    let history = createHistory('a');
    history = pushHistory(history, 'b');
    history = pushHistory(history, 'c');

    expect(canUndo(history)).toBe(true);
    history = undo(history);
    expect(history.present).toBe('b');
    history = undo(history);
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);
  });

  it('redoes what was undone', () => {
    let history = createHistory('a');
    history = pushHistory(history, 'b');
    history = undo(history);
    expect(canRedo(history)).toBe(true);
    history = redo(history);
    expect(history.present).toBe('b');
    expect(canRedo(history)).toBe(false);
  });

  it('drops the redo stack once a new change lands', () => {
    let history = createHistory('a');
    history = pushHistory(history, 'b');
    history = undo(history);
    history = pushHistory(history, 'c');
    expect(canRedo(history)).toBe(false);
    expect(history.present).toBe('c');
  });

  it('ignores a push of the same value', () => {
    const history = createHistory('a');
    expect(pushHistory(history, 'a')).toBe(history);
  });

  it('keeps unlimited history by default', () => {
    let history = createHistory(0);
    for (let step = 1; step <= 50; step += 1) {
      history = pushHistory(history, step);
    }
    expect(history.past).toHaveLength(50);
  });

  it('trims the oldest entries when a limit is set', () => {
    let history = createHistory(0, 2);
    history = pushHistory(history, 1);
    history = pushHistory(history, 2);
    history = pushHistory(history, 3);
    expect(history.past).toEqual([1, 2]);
  });

  it('does nothing when undo or redo has nothing to do', () => {
    const history = createHistory('a');
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });
});

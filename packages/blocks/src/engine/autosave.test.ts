import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Autosave } from './autosave.js';

describe('Autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the debounce window before saving', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = new Autosave({ delay: 2000, save });

    autosave.schedule('first');
    expect(save).not.toHaveBeenCalled();
    expect(autosave.hasPending).toBe(true);

    await vi.advanceTimersByTimeAsync(1999);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledWith('first');
    expect(autosave.hasPending).toBe(false);
  });

  it('keeps only the newest value while typing', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = new Autosave({ delay: 2000, save });

    autosave.schedule('a');
    autosave.schedule('b');
    autosave.schedule('c');
    await vi.advanceTimersByTimeAsync(2000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('c');
  });

  it('flushes immediately and reports the saved value', async () => {
    const onSaved = vi.fn();
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = new Autosave({ delay: 2000, save, onSaved });

    autosave.schedule('draft');
    await autosave.flush();

    expect(save).toHaveBeenCalledWith('draft');
    expect(onSaved).toHaveBeenCalledWith('draft');
    expect(autosave.hasPending).toBe(false);
  });

  it('reports an error and lets the caller decide', async () => {
    const onError = vi.fn();
    const failure = new Error('conflict');
    const save = vi.fn().mockRejectedValue(failure);
    const autosave = new Autosave({ delay: 10, save, onError });

    autosave.schedule('draft');
    await expect(autosave.flush()).rejects.toThrow('conflict');
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('does not save anything after cancel', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = new Autosave({ delay: 10, save });

    autosave.schedule('draft');
    autosave.cancel();
    await vi.advanceTimersByTimeAsync(100);

    expect(save).not.toHaveBeenCalled();
    expect(autosave.hasPending).toBe(false);
  });
});

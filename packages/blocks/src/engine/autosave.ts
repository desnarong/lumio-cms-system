export interface AutosaveOptions<T> {
  /** Debounce window in ms; the editor uses 2000 per docs/design/04-ux.md 4.2. */
  delay: number;
  save: (value: T) => Promise<void>;
  onSaved?: (value: T) => void;
  onError?: (error: unknown) => void;
}

/**
 * Debounced save queue. `schedule()` keeps only the newest value, and `flush()`
 * waits until everything is written, which is what Publish needs before it
 * copies the draft to the public site.
 */
export class Autosave<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: T | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly options: AutosaveOptions<T>) {}

  get hasPending(): boolean {
    return this.pending !== null || this.timer !== null;
  }

  schedule(value: T): void {
    this.pending = value;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.flush().catch(() => undefined);
    }, this.options.delay);
  }

  /** Writes the pending value now and waits for any in-flight save to finish. */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inFlight) {
      await this.inFlight;
    }
    while (this.pending !== null) {
      const value = this.pending;
      this.pending = null;
      const run = this.options.save(value).then(() => {
        this.options.onSaved?.(value);
      });
      this.inFlight = run;
      try {
        await run;
      } catch (error) {
        this.options.onError?.(error);
        throw error;
      } finally {
        this.inFlight = null;
      }
    }
  }

  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }
}

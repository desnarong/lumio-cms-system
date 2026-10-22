/**
 * Job queue contract (docs/design/10-architecture.md 10.2). Background work is
 * split in two halves: the API only *enqueues* (publish, media render, trash
 * purge), and the worker *consumes*.
 *
 * Two drivers implement it:
 *
 * - `InMemoryJobQueue` keeps jobs in the process. It is the default for
 *   development, tests and single-instance deployments, and it is what makes
 *   `PUBLISH_INLINE`/`MEDIA_INLINE` work without any infrastructure.
 * - `BullMqJobQueue` (see `bullmq-queue.ts`) puts the jobs in Redis so several
 *   API instances can enqueue and several workers can consume, with retries and
 *   a visible backlog. It is selected with `QUEUE_DRIVER=bullmq`.
 *
 * `take`/`complete`/`fail` are the pull half used by the in-memory driver (and
 * by tests that drive a queue by hand). A push driver delivers through
 * `consume` instead, where `take` answers `null` and the worker reports
 * completion itself.
 */

export type QueueDriver = 'memory' | 'bullmq';

/** Identity and bookkeeping every queued job carries next to its payload. */
export interface JobMeta {
  id: string;
  attempts: number;
  createdAt: string;
}

/** The payload plus its bookkeeping, so callers read `job.siteId` directly. */
export type JobOf<Input> = Input & JobMeta;

export interface JobFailure<Input> {
  job: JobOf<Input>;
  reason: string;
}

export interface QueueConsumer {
  stop(): Promise<void>;
}

export type JobHandler<Input> = (job: JobOf<Input>) => Promise<unknown>;

export interface ConsumeOptions {
  /** How often the in-memory driver looks for new work (ignored by push drivers). */
  pollMs?: number;
}

export interface JobQueue<Input> {
  readonly driver: QueueDriver;
  /** Jobs waiting to be handled (approximate for the Redis driver). */
  readonly size: number;
  readonly failures: ReadonlyArray<JobFailure<Input>>;
  add(input: Input): Promise<JobOf<Input>>;
  take(): Promise<JobOf<Input> | null>;
  complete(jobId: string): void;
  fail(job: JobOf<Input>, reason: string): void;
  /** Handles jobs until the returned consumer is stopped. */
  consume(handler: JobHandler<Input>, options?: ConsumeOptions): Promise<QueueConsumer>;
  /** Releases any connection the driver holds. */
  close(): Promise<void>;
}

let sequence = 0;

const nextId = (prefix: string): string => {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`;
};

export const newJobMeta = (prefix: string): JobMeta => ({
  id: nextId(prefix),
  attempts: 0,
  createdAt: new Date().toISOString(),
});

/**
 * Single-process queue. `consume` polls `take` on a timer, which keeps the
 * worker loop identical to the way the API drains its own queue inline.
 */
export class InMemoryJobQueue<Input extends object> implements JobQueue<Input> {
  readonly driver = 'memory' as const;

  private readonly pending: Array<JobOf<Input>> = [];
  private readonly failureList: Array<JobFailure<Input>> = [];

  constructor(private readonly prefix: string = 'job') {}

  async add(input: Input): Promise<JobOf<Input>> {
    const job = { ...input, ...newJobMeta(this.prefix) } as JobOf<Input>;
    this.pending.push(job);
    return job;
  }

  async take(): Promise<JobOf<Input> | null> {
    return this.pending.shift() ?? null;
  }

  complete(_jobId: string): void {
    // The job left the queue when it was taken; nothing to release.
  }

  fail(job: JobOf<Input>, reason: string): void {
    this.failureList.push({ job, reason });
  }

  async consume(handler: JobHandler<Input>, options: ConsumeOptions = {}): Promise<QueueConsumer> {
    const pollMs = Math.max(5, options.pollMs ?? 1_000);
    let stopped = false;
    let running = false;

    const tick = async (): Promise<void> => {
      if (stopped || running) return;
      running = true;
      try {
        for (;;) {
          const job = await this.take();
          if (!job || stopped) break;
          await this.run(handler, job);
        }
      } finally {
        running = false;
      }
    };

    const timer = setInterval(() => void tick(), pollMs);
    timer.unref?.();

    return {
      stop: async () => {
        stopped = true;
        clearInterval(timer);
      },
    };
  }

  async close(): Promise<void> {
    this.pending.length = 0;
  }

  get size(): number {
    return this.pending.length;
  }

  get failures(): ReadonlyArray<JobFailure<Input>> {
    return this.failureList;
  }

  /** Runs one job, recording the failure instead of letting it escape. */
  private async run(handler: JobHandler<Input>, job: JobOf<Input>): Promise<void> {
    job.attempts += 1;
    try {
      await handler(job);
      this.complete(job.id);
    } catch (error) {
      this.fail(job, error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ');
    }
  }
}

/** Which driver the `QUEUE_DRIVER` environment asks for. */
export const queueDriverName = (env: NodeJS.ProcessEnv = process.env): QueueDriver =>
  env.QUEUE_DRIVER === 'bullmq' ? 'bullmq' : 'memory';
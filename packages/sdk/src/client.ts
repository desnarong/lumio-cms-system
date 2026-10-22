import { createRequestId, isBridgeResponse, type BridgeRequest, type BridgeResponse } from './bridge.js';

/**
 * The two ends of the App bridge (docs/design/16-apps.md 16.4).
 *
 * - `createBridgeClient` is what an App calls from inside its sandboxed iframe.
 * - `createBridgeHost` is what Lumio runs on the other side; it only trusts
 *   messages that come from the App's own frame.
 */

export interface BridgeClientOptions {
  /** Where the host lives; `window.parent` by default. */
  target?: Window;
  /** Origin the host listens on; `'*'` is fine inside a sandboxed frame. */
  targetOrigin?: string;
  timeoutMs?: number;
}

export interface BridgeClient {
  call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
}

export const createBridgeClient = (options: BridgeClientOptions = {}): BridgeClient => {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const targetOrigin = options.targetOrigin ?? '*';

  return {
    call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const target = options.target ?? (typeof window !== 'undefined' ? window.parent : undefined);
        if (!target) {
          reject(new Error('ไม่พบหน้าต่างของ Lumio ที่จะเชื่อมต่อ'));
          return;
        }

        const id = createRequestId();
        const timer = setTimeout(() => {
          window.removeEventListener('message', onMessage);
          reject(new Error('เชื่อมต่อกับ Lumio หมดเวลา'));
        }, timeoutMs);

        function onMessage(event: MessageEvent): void {
          if (!isBridgeResponse(event.data) || event.data.id !== id) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          if (event.data.ok) resolve(event.data.result as T);
          else reject(new Error(event.data.error ?? 'Lumio ปฏิเสธคำขอนี้'));
        }

        window.addEventListener('message', onMessage);
        target.postMessage({ id, method, params } satisfies BridgeRequest, targetOrigin);
      });
    },
  };
};

/** Turns one inbound message into a response; pure so it is easy to test. */
export const answerBridgeRequest = async (
  data: unknown,
  onCall: (request: BridgeRequest) => Promise<unknown>,
): Promise<BridgeResponse | null> => {
  if (typeof data !== 'object' || data === null) return null;
  const candidate = data as Partial<BridgeRequest>;
  if (typeof candidate.id !== 'string' || typeof candidate.method !== 'string') return null;

  const request: BridgeRequest = {
    id: candidate.id,
    method: candidate.method,
    ...(candidate.params ? { params: candidate.params } : {}),
  };

  try {
    return { id: request.id, ok: true, result: await onCall(request) };
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดใน Lumio',
    };
  }
};

export interface BridgeHostOptions {
  /** The App's frame window; anything else is ignored. */
  frame: () => Window | null;
  onCall: (request: BridgeRequest) => Promise<unknown>;
}

export interface BridgeHost {
  handleMessage(event: MessageEvent): void;
}

/** Host side of the bridge: validates the sender, then answers through the frame. */
export const createBridgeHost = ({ frame, onCall }: BridgeHostOptions): BridgeHost => ({
  handleMessage(event: MessageEvent): void {
    const target = frame();
    if (!target || event.source !== target) return;

    void answerBridgeRequest(event.data, onCall).then((response) => {
      if (response) target.postMessage(response, '*');
    });
  },
});

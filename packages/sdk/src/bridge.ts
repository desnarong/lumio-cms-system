/** postMessage contract between an App (sandboxed iframe) and the Lumio bridge. */

export interface BridgeRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

let requestCounter = 0;

export const createRequestId = (): string => {
  requestCounter += 1;
  return `req_${Date.now().toString(36)}_${requestCounter.toString(36)}`;
};

export const isBridgeResponse = (value: unknown): value is BridgeResponse => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<BridgeResponse>;
  return typeof candidate.id === 'string' && typeof candidate.ok === 'boolean';
};

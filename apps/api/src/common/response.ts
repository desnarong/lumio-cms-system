export interface ApiMeta {
  cursor?: string | null;
  total?: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown[];
}

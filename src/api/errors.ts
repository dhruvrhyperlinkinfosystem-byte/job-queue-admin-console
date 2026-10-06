export interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds?: number | null;
}

/** Every failed call surfaces as one of these, including network failures (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number | null;

  constructor({ status, code, message, retryAfterSeconds = null }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

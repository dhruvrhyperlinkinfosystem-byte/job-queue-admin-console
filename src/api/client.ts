import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";

export const API_BASE = "/api/v1";

export interface ApiConfig {
  getToken: () => string | null;
  /** Called on every 401 before the error is thrown, so the app can sign out. */
  onUnauthorized: () => void;
}

let config: ApiConfig = { getToken: () => null, onUnauthorized: () => {} };

export function configureApi(next: Partial<ApiConfig>): void {
  config = { ...config, ...next };
}

type QueryValue = string | number | readonly string[] | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === "") continue;
    if (typeof value === "object") {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const inner = value.error;
  return (
    typeof inner === "object" &&
    inner !== null &&
    "code" in inner &&
    "message" in inner &&
    typeof inner.code === "string" &&
    typeof inner.message === "string"
  );
}

function parseRetryAfter(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await readJson(response);
  const { code, message } = isErrorBody(body)
    ? body.error
    : { code: "http_error", message: `Request failed with status ${response.status}` };
  return new ApiError({
    status: response.status,
    code,
    message,
    retryAfterSeconds: parseRetryAfter(response.headers.get("Retry-After")),
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = config.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({
      status: 0,
      code: "network_error",
      message: "Could not reach the server. Check your connection and try again.",
    });
  }

  if (!response.ok) {
    const apiError = await toApiError(response);
    if (apiError.status === 401) config.onUnauthorized();
    throw apiError;
  }
  return (await readJson(response)) as T;
}

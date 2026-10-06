import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/errors";

const MAX_AUTO_RETRIES = 3;

interface Result<T> {
  requestKey: string;
  data: T | undefined;
  error: ApiError | null;
  /** When set, the hook will reload by itself at this time (429 with Retry-After). */
  retryAt: number | null;
}

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | null;
  /** True while a request for the current key is in flight; `data` may be stale meanwhile. */
  isLoading: boolean;
  retryAt: number | null;
  reload: () => void;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({
    status: 0,
    code: "unknown_error",
    message: error instanceof Error ? error.message : "Something went wrong",
  });
}

/**
 * Loads data whenever `key` changes. Previous data stays available while the next request runs.
 * A 429 reloads automatically after Retry-After; other errors wait for a manual `reload`.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string,
): QueryState<T> {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const fetcherRef = useRef(fetcher);
  const autoRetries = useRef(0);
  const requestKey = `${key}#${reloadCount}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    autoRetries.current = 0;
  }, [key]);

  useEffect(() => {
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => {
        autoRetries.current = 0;
        setResult({ requestKey, data, error: null, retryAt: null });
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        const error = toApiError(caught);
        const canRetry =
          error.status === 429 &&
          error.retryAfterSeconds !== null &&
          autoRetries.current < MAX_AUTO_RETRIES;
        const retryAt = canRetry ? Date.now() + (error.retryAfterSeconds ?? 0) * 1000 : null;
        setResult({ requestKey, data: undefined, error, retryAt });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const retryAt = result?.requestKey === requestKey ? result.retryAt : null;
  useEffect(() => {
    if (retryAt === null) return;
    const timer = setTimeout(
      () => {
        autoRetries.current += 1;
        setReloadCount((count) => count + 1);
      },
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);

  const reload = useCallback(() => {
    autoRetries.current = 0;
    setReloadCount((count) => count + 1);
  }, []);

  const isCurrent = result?.requestKey === requestKey;
  return {
    data: result?.data,
    error: isCurrent ? result.error : null,
    isLoading: !isCurrent,
    retryAt,
    reload,
  };
}

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useCountdown } from "../hooks/useCountdown";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
  /** Epoch ms of the automatic retry, when a 429 told us how long to wait. */
  retryAt?: number | null;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryAt = null,
}: ErrorStateProps) {
  const secondsLeft = useCountdown(retryAt);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900 dark:bg-red-950/40"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-slate-700 dark:text-slate-200">{message}</p>
      {secondsLeft !== null && (
        <p className="text-sm font-medium">
          Rate limited. Retrying automatically in {secondsLeft}s.
        </p>
      )}
      <Button onClick={onRetry}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {secondsLeft !== null ? "Retry now" : "Try again"}
      </Button>
    </div>
  );
}

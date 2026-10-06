import { TriangleAlert } from "lucide-react";
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
      className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40"
    >
      <TriangleAlert className="size-8 text-red-700 dark:text-red-300" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-slate-700 dark:text-slate-300">{message}</p>
      {secondsLeft !== null && (
        <p className="text-sm font-medium">
          Rate limited. Retrying automatically in {secondsLeft}s.
        </p>
      )}
      <Button onClick={onRetry}>{secondsLeft !== null ? "Retry now" : "Try again"}</Button>
    </div>
  );
}
